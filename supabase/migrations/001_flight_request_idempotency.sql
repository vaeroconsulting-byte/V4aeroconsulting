-- Persist flight quote requests atomically and make retries idempotent.
-- Apply this migration as a database administrator; it does not schedule Cron.

DO $preflight$
BEGIN
  IF pg_catalog.current_setting('server_version_num')::pg_catalog.int4 < 170000
     OR pg_catalog.getdatabaseencoding() <> 'UTF8' THEN
    RAISE EXCEPTION
      'Migration requires PostgreSQL 17 or later with UTF8 database encoding for NFC fingerprint normalization.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = 'service_role'
      AND rolbypassrls
  ) THEN
    RAISE EXCEPTION
      'Migration requires service_role to exist with rolbypassrls = true; no policies on clients or flight_requests will be changed.';
  END IF;
END;
$preflight$;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $extension_check$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_extension AS extension
    JOIN pg_catalog.pg_namespace AS extension_schema
      ON extension_schema.oid = extension.extnamespace
    WHERE extension.extname = 'pgcrypto'
      AND extension_schema.nspname = 'extensions'
  ) THEN
    RAISE EXCEPTION
      'pgcrypto must be installed in the extensions schema for the qualified SHA-256 call.';
  END IF;
END;
$extension_check$;

CREATE TABLE public.flight_request_idempotency (
  idempotency_key pg_catalog.uuid PRIMARY KEY,
  request_fingerprint pg_catalog.text NOT NULL
    CONSTRAINT flight_request_idempotency_fingerprint_format
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  flight_request_id pg_catalog.uuid NOT NULL UNIQUE
    REFERENCES public.flight_requests (id) ON DELETE CASCADE,
  created_at pg_catalog.timestamptz NOT NULL DEFAULT pg_catalog.now(),
  expires_at pg_catalog.timestamptz NOT NULL
    DEFAULT (pg_catalog.now() + INTERVAL '24 hours'),
  CONSTRAINT flight_request_idempotency_expires_after_24_hours
    CHECK (expires_at = created_at + INTERVAL '24 hours')
);

CREATE INDEX flight_request_idempotency_expires_at_idx
  ON public.flight_request_idempotency (expires_at);

ALTER TABLE public.flight_request_idempotency ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.flight_request_idempotency
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.flight_request_idempotency
  TO service_role;

GRANT USAGE ON SCHEMA public, extensions TO service_role;
GRANT EXECUTE ON FUNCTION extensions.digest(pg_catalog.bytea, pg_catalog.text)
  TO service_role;

-- The invoker needs only these base-table permissions. RLS remains enabled;
-- the preflight above ensures the service_role bypasses it without new policies.
GRANT INSERT ON TABLE public.clients, public.flight_requests TO service_role;
GRANT SELECT (id) ON TABLE public.clients, public.flight_requests TO service_role;

CREATE FUNCTION public.create_flight_quote_request(
  p_idempotency_key pg_catalog.uuid,
  p_full_name pg_catalog.text,
  p_company pg_catalog.text,
  p_phone pg_catalog.text,
  p_email pg_catalog.text,
  p_origin pg_catalog.text,
  p_destination pg_catalog.text,
  p_trip_type pg_catalog.text,
  p_passengers pg_catalog.int4,
  p_departure_date pg_catalog.date,
  p_departure_time time without time zone,
  p_return_date pg_catalog.date,
  p_return_time time without time zone,
  p_notes pg_catalog.text
)
RETURNS pg_catalog.uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_fingerprint_full_name pg_catalog.text;
  v_fingerprint_company pg_catalog.text;
  v_fingerprint_phone pg_catalog.text;
  v_fingerprint_email pg_catalog.text;
  v_fingerprint_origin pg_catalog.text;
  v_fingerprint_destination pg_catalog.text;
  v_fingerprint_notes pg_catalog.text;
  v_payload pg_catalog.jsonb;
  v_fingerprint pg_catalog.text;
  v_existing_fingerprint pg_catalog.text;
  v_existing_request_id pg_catalog.uuid;
  v_existing_expires_at pg_catalog.timestamptz;
  v_client_id pg_catalog.uuid;
  v_flight_request_id pg_catalog.uuid;
  v_now pg_catalog.timestamptz;
BEGIN
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_idempotency_key';
  END IF;

  IF p_full_name IS NULL
     OR pg_catalog.btrim(p_full_name) = ''
     OR pg_catalog.char_length(p_full_name) > 120 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_full_name';
  END IF;

  IF p_company IS NOT NULL AND pg_catalog.char_length(p_company) > 120 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_company';
  END IF;

  IF p_phone IS NULL
     OR pg_catalog.btrim(p_phone) = ''
     OR pg_catalog.char_length(p_phone) > 25
     OR p_phone !~ '^\+?[0-9[:space:]().-]+$'
     OR pg_catalog.char_length(
       pg_catalog.regexp_replace(p_phone, '[^0-9]', '', 'g')
     ) NOT BETWEEN 8 AND 15 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_phone';
  END IF;

  IF p_email IS NOT NULL
     AND (
       pg_catalog.char_length(p_email) > 254
       OR (
         pg_catalog.btrim(p_email) <> ''
         AND p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
       )
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_email';
  END IF;

  IF p_origin IS NULL
     OR pg_catalog.btrim(p_origin) = ''
     OR pg_catalog.char_length(p_origin) > 100 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_origin';
  END IF;

  IF p_destination IS NULL
     OR pg_catalog.btrim(p_destination) = ''
     OR pg_catalog.char_length(p_destination) > 100 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_destination';
  END IF;

  IF p_trip_type IS NULL OR p_trip_type NOT IN ('one_way', 'round_trip') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_trip_type';
  END IF;

  IF p_passengers IS NULL OR p_passengers NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_passengers';
  END IF;

  IF p_departure_date IS NULL OR p_departure_time IS NULL
     OR EXTRACT(HOUR FROM p_departure_time) NOT BETWEEN 0 AND 23
     OR EXTRACT(SECOND FROM p_departure_time) >= 60
     OR EXTRACT(SECOND FROM p_departure_time)
       <> pg_catalog.trunc(EXTRACT(SECOND FROM p_departure_time)) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_departure';
  END IF;

  IF p_trip_type = 'round_trip' THEN
    IF p_return_date IS NULL OR p_return_time IS NULL
       OR p_return_date < p_departure_date
       OR EXTRACT(HOUR FROM p_return_time) NOT BETWEEN 0 AND 23
       OR EXTRACT(SECOND FROM p_return_time) >= 60
       OR EXTRACT(SECOND FROM p_return_time)
         <> pg_catalog.trunc(EXTRACT(SECOND FROM p_return_time)) THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'invalid_return';
    END IF;
  ELSIF p_return_date IS NOT NULL OR p_return_time IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'return_not_allowed_for_one_way';
  END IF;

  IF p_notes IS NOT NULL AND pg_catalog.char_length(p_notes) > 1000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_notes';
  END IF;

  -- NFC is PostgreSQL syntax for a built-in in pg_catalog. With an empty
  -- search_path, PostgreSQL implicitly searches pg_catalog for this form.
  v_fingerprint_full_name := normalize(
    pg_catalog.btrim(
      pg_catalog.regexp_replace(p_full_name, '[[:space:]]+', ' ', 'g')
    ),
    NFC
  );
  v_fingerprint_company := normalize(
    pg_catalog.btrim(
      pg_catalog.regexp_replace(
        COALESCE(p_company, ''),
        '[[:space:]]+',
        ' ',
        'g'
      )
    ),
    NFC
  );
  v_fingerprint_phone := pg_catalog.regexp_replace(
    pg_catalog.btrim(p_phone),
    '[^0-9]',
    '',
    'g'
  );
  v_fingerprint_email := CASE
    WHEN pg_catalog.btrim(p_email) IS NULL OR pg_catalog.btrim(p_email) = ''
      THEN ''
    ELSE normalize(
      pg_catalog.split_part(pg_catalog.btrim(p_email), '@', 1)
        || '@'
        || pg_catalog.lower(pg_catalog.split_part(pg_catalog.btrim(p_email), '@', 2)),
      NFC
    )
  END;
  v_fingerprint_origin := normalize(
    pg_catalog.btrim(
      pg_catalog.regexp_replace(p_origin, '[[:space:]]+', ' ', 'g')
    ),
    NFC
  );
  v_fingerprint_destination := normalize(
    pg_catalog.btrim(
      pg_catalog.regexp_replace(p_destination, '[[:space:]]+', ' ', 'g')
    ),
    NFC
  );
  v_fingerprint_notes := normalize(
    pg_catalog.btrim(
      pg_catalog.regexp_replace(
        COALESCE(p_notes, ''),
        '[[:space:]]+',
        ' ',
        'g'
      )
    ),
    NFC
  );

  -- Preserve the submitted values in the client and flight request rows;
  -- normalized values are used only to build the idempotency fingerprint.
  v_payload := pg_catalog.jsonb_build_object(
    'full_name', v_fingerprint_full_name,
    'company', v_fingerprint_company,
    'phone', v_fingerprint_phone,
    'email', v_fingerprint_email,
    'origin', v_fingerprint_origin,
    'destination', v_fingerprint_destination,
    'trip_type', p_trip_type,
    'passengers', p_passengers,
    'departure_date', p_departure_date,
    'departure_time', p_departure_time,
    'return_date', p_return_date,
    'return_time', p_return_time,
    'notes', v_fingerprint_notes
  );
  v_fingerprint := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(v_payload::pg_catalog.text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_idempotency_key::pg_catalog.text, 0)
  );

  v_now := pg_catalog.clock_timestamp();

  DELETE FROM public.flight_request_idempotency
  WHERE idempotency_key = p_idempotency_key
    AND expires_at <= v_now;

  SELECT request_fingerprint, flight_request_id, expires_at
  INTO v_existing_fingerprint, v_existing_request_id, v_existing_expires_at
  FROM public.flight_request_idempotency
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_expires_at > v_now THEN
      IF v_existing_fingerprint <> v_fingerprint THEN
        RAISE EXCEPTION USING
          ERRCODE = 'V4001',
          MESSAGE = 'idempotency_key_reused_with_different_payload';
      END IF;

      RETURN v_existing_request_id;
    END IF;
  END IF;

  INSERT INTO public.clients (full_name, company, phone, email)
  VALUES (p_full_name, p_company, p_phone, p_email)
  RETURNING id INTO v_client_id;

  INSERT INTO public.flight_requests (
    client_id,
    origin,
    destination,
    trip_type,
    passengers,
    departure_date,
    departure_time,
    return_date,
    return_time,
    notes
  )
  VALUES (
    v_client_id,
    p_origin,
    p_destination,
    p_trip_type,
    p_passengers,
    p_departure_date,
    p_departure_time,
    p_return_date,
    p_return_time,
    p_notes
  )
  RETURNING id INTO v_flight_request_id;

  INSERT INTO public.flight_request_idempotency (
    idempotency_key,
    request_fingerprint,
    flight_request_id,
    created_at,
    expires_at
  )
  VALUES (
    p_idempotency_key,
    v_fingerprint,
    v_flight_request_id,
    v_now,
    v_now + INTERVAL '24 hours'
  );

  RETURN v_flight_request_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_flight_quote_request(
  pg_catalog.uuid,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.int4,
  pg_catalog.date,
  time without time zone,
  pg_catalog.date,
  time without time zone,
  pg_catalog.text
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_flight_quote_request(
  pg_catalog.uuid,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.int4,
  pg_catalog.date,
  time without time zone,
  pg_catalog.date,
  time without time zone,
  pg_catalog.text
) TO service_role;
