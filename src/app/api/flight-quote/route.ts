import { createHash } from "node:crypto";
import {
  createSupabaseServerClient,
  SupabaseServerConfigurationError,
  type CreateFlightQuoteRequestArgs,
} from "@/lib/supabase/server";

const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_RATE_LIMIT_ENTRIES = 10_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_FIELDS = new Set([
  "full_name",
  "company",
  "phone",
  "email",
  "origin",
  "destination",
  "trip_type",
  "passengers",
  "departure_date",
  "departure_time",
  "return_date",
  "return_time",
  "notes",
]);

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface FlightQuotePayload {
  full_name: string;
  company: string | null;
  phone: string;
  email: string | null;
  origin: string;
  destination: string;
  trip_type: "one_way" | "round_trip";
  passengers: number;
  departure_date: string;
  departure_time: string;
  return_date: string | null;
  return_time: string | null;
  notes: string | null;
}

interface ValidationResult {
  payload?: FlightQuotePayload;
  errors?: Record<string, string>;
}

const rateLimitEntries = new Map<string, RateLimitEntry>();

function jsonResponse(body: object, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function readLimitedBody(request: Request): Promise<string | null> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return null;
  }

  if (!request.body) {
    return null;
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    return null;
  }
}

function normalizeText(
  value: unknown,
  field: string,
  maxLength: number,
  errors: Record<string, string>,
  required: boolean,
): string | null {
  if (value === undefined || value === null) {
    if (required) {
      errors[field] = "Este campo é obrigatório.";
    }
    return null;
  }

  if (typeof value !== "string") {
    errors[field] = "Informe um texto válido.";
    return null;
  }

  const normalized = value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalized.length > maxLength) {
    errors[field] = `Este campo deve ter no máximo ${maxLength} caracteres.`;
    return null;
  }

  if (required && !normalized) {
    errors[field] = "Este campo é obrigatório.";
    return null;
  }

  return normalized || null;
}

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validatePayload(value: unknown): ValidationResult {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return { errors: { body: "O corpo deve ser um objeto JSON." } };
  }

  const source = value as Record<string, unknown>;
  const errors: Record<string, string> = {};

  for (const field of Object.keys(source)) {
    if (!ALLOWED_FIELDS.has(field)) {
      errors.body = "O corpo contém campos não permitidos.";
      break;
    }
  }

  const fullName = normalizeText(
    source.full_name,
    "full_name",
    120,
    errors,
    true,
  );
  const company = normalizeText(source.company, "company", 120, errors, false);
  const phone = normalizeText(source.phone, "phone", 25, errors, true);
  const email = normalizeText(source.email, "email", 254, errors, false);
  const origin = normalizeText(source.origin, "origin", 100, errors, true);
  const destination = normalizeText(
    source.destination,
    "destination",
    100,
    errors,
    true,
  );
  const notes = normalizeText(source.notes, "notes", 1000, errors, false);

  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (
      digits.length < 8 ||
      digits.length > 15 ||
      !/^\+?[\d\s().-]+$/.test(phone)
    ) {
      errors.phone = "Informe um telefone válido.";
    }
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Informe um e-mail válido.";
  }

  const tripType =
    source.trip_type === "one_way" || source.trip_type === "round_trip"
      ? source.trip_type
      : null;
  if (tripType === null) {
    errors.trip_type = "Tipo de viagem inválido.";
  }

  const passengers =
    typeof source.passengers === "number" &&
    Number.isInteger(source.passengers) &&
    source.passengers >= 1 &&
    source.passengers <= 500
      ? source.passengers
      : null;
  if (
    passengers === null
  ) {
    errors.passengers = "A quantidade deve estar entre 1 e 500.";
  }

  const departureDate =
    typeof source.departure_date === "string" ? source.departure_date : "";
  if (!isValidDate(departureDate)) {
    errors.departure_date = "Informe uma data de partida válida.";
  }

  const departureTime =
    typeof source.departure_time === "string" ? source.departure_time : "";
  if (!TIME_PATTERN.test(departureTime)) {
    errors.departure_time = "Informe um horário de partida válido.";
  }

  const returnDate = source.return_date;
  const returnTime = source.return_time;
  if (tripType === "round_trip") {
    if (typeof returnDate !== "string" || !isValidDate(returnDate)) {
      errors.return_date = "Informe uma data de retorno válida.";
    } else if (isValidDate(departureDate) && returnDate < departureDate) {
      errors.return_date =
        "A data de retorno não pode ser anterior à partida.";
    }

    if (typeof returnTime !== "string" || !TIME_PATTERN.test(returnTime)) {
      errors.return_time = "Informe um horário de retorno válido.";
    }
  } else if (
    (returnDate !== undefined && returnDate !== null && returnDate !== "") ||
    (returnTime !== undefined && returnTime !== null && returnTime !== "")
  ) {
    errors.return_date =
      "Viagens somente de ida não devem incluir dados de retorno.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  if (
    fullName === null ||
    phone === null ||
    origin === null ||
    destination === null ||
    tripType === null ||
    passengers === null
  ) {
    return { errors: { body: "Revise os dados informados." } };
  }

  const normalizedReturnDate =
    tripType === "round_trip" &&
    typeof returnDate === "string" &&
    isValidDate(returnDate)
      ? returnDate
      : null;
  const normalizedReturnTime =
    tripType === "round_trip" &&
    typeof returnTime === "string" &&
    TIME_PATTERN.test(returnTime)
      ? returnTime
      : null;

  return {
    payload: {
      full_name: fullName,
      company,
      phone,
      email,
      origin,
      destination,
      trip_type: tripType,
      passengers,
      departure_date: departureDate,
      departure_time: departureTime,
      return_date: normalizedReturnDate,
      return_time: normalizedReturnTime,
      notes,
    },
  };
}

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) {
    return false;
  }

  try {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.protocol !== "https:" && parsedOrigin.protocol !== "http:") {
      return false;
    }
    if (parsedOrigin.host.toLowerCase() !== host.toLowerCase()) {
      return false;
    }
  } catch {
    return false;
  }

  return request.headers.get("sec-fetch-site") !== "cross-site";
}

function getRateLimitKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const address = realIp || forwardedFor?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(address).digest("hex");
}

function isRateLimited(request: Request): boolean {
  const now = Date.now();
  const key = getRateLimitKey(request);
  const current = rateLimitEntries.get(key);

  if (!current || current.resetAt <= now) {
    if (rateLimitEntries.size >= MAX_RATE_LIMIT_ENTRIES) {
      for (const [entryKey, entry] of rateLimitEntries) {
        if (entry.resetAt <= now) {
          rateLimitEntries.delete(entryKey);
        }
      }
      if (rateLimitEntries.size >= MAX_RATE_LIMIT_ENTRIES) {
        return true;
      }
    }

    rateLimitEntries.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  current.count += 1;
  return false;
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return jsonResponse({ error: "Requisição não permitida." }, 403);
  }

  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return jsonResponse({ error: "Formato de requisição inválido." }, 415);
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey || !UUID_PATTERN.test(idempotencyKey)) {
    return jsonResponse({ error: "Chave de idempotência inválida." }, 400);
  }

  const bodyText = await readLimitedBody(request);
  if (bodyText === null) {
    return jsonResponse({ error: "A requisição excede o limite permitido." }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return jsonResponse({ error: "JSON inválido." }, 400);
  }

  const validation = validatePayload(body);
  if (!validation.payload) {
    return jsonResponse(
      { error: "Revise os dados informados.", fields: validation.errors },
      400,
    );
  }

  if (isRateLimited(request)) {
    return jsonResponse(
      { error: "Muitas solicitações. Tente novamente mais tarde." },
      429,
    );
  }

  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch (error) {
    if (error instanceof SupabaseServerConfigurationError) {
      console.error("Flight quote persistence is not configured.");
      return jsonResponse(
        { error: "O serviço está temporariamente indisponível." },
        503,
      );
    }
    throw error;
  }

  const args: CreateFlightQuoteRequestArgs = {
    p_idempotency_key: idempotencyKey.toLowerCase(),
    p_full_name: validation.payload.full_name,
    p_company: validation.payload.company,
    p_phone: validation.payload.phone,
    p_email: validation.payload.email,
    p_origin: validation.payload.origin,
    p_destination: validation.payload.destination,
    p_trip_type: validation.payload.trip_type,
    p_passengers: validation.payload.passengers,
    p_departure_date: validation.payload.departure_date,
    p_departure_time: validation.payload.departure_time,
    p_return_date: validation.payload.return_date,
    p_return_time: validation.payload.return_time,
    p_notes: validation.payload.notes,
  };

  try {
    const { data, error } = await supabase.rpc(
      "create_flight_quote_request",
      args,
    );

    if (error) {
      if (error.code === "V4001") {
        return jsonResponse(
          { error: "A chave da solicitação já foi usada com outros dados." },
          409,
        );
      }

      console.error(
        "Flight quote persistence failed.",
        error.code || "unknown_database_error",
      );
      return jsonResponse(
        { error: "Não foi possível registrar a solicitação." },
        503,
      );
    }

    if (typeof data !== "string" || !UUID_PATTERN.test(data)) {
      console.error("Flight quote persistence returned an invalid identifier.");
      return jsonResponse(
        { error: "Não foi possível registrar a solicitação." },
        503,
      );
    }

    return jsonResponse({ requestId: data }, 201);
  } catch {
    console.error("Flight quote persistence request failed.");
    return jsonResponse(
      { error: "Não foi possível registrar a solicitação." },
      503,
    );
  }
}
