import "server-only";

import { createClient } from "@supabase/supabase-js";

export type CreateFlightQuoteRequestArgs = {
  p_idempotency_key: string;
  p_full_name: string;
  p_company: string | null;
  p_phone: string;
  p_email: string | null;
  p_origin: string;
  p_destination: string;
  p_trip_type: "one_way" | "round_trip";
  p_passengers: number;
  p_departure_date: string;
  p_departure_time: string;
  p_return_date: string | null;
  p_return_time: string | null;
  p_notes: string | null;
}

interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      create_flight_quote_request: {
        Args: CreateFlightQuoteRequestArgs;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export class SupabaseServerConfigurationError extends Error {
  constructor() {
    super("Supabase server configuration is incomplete.");
    this.name = "SupabaseServerConfigurationError";
  }
}

export function createSupabaseServerClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new SupabaseServerConfigurationError();
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new SupabaseServerConfigurationError();
  }

  const isLocalHttp =
    parsedUrl.protocol === "http:" &&
    (parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1" ||
      parsedUrl.hostname === "[::1]");

  if (
    (parsedUrl.protocol !== "https:" && !isLocalHttp) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new SupabaseServerConfigurationError();
  }

  return createClient<Database>(parsedUrl.origin, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
