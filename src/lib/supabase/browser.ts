"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./public-config";

export function createSupabaseBrowserClient() {
  const { supabaseUrl, publishableKey } = getSupabasePublicConfig();
  return createBrowserClient(supabaseUrl, publishableKey);
}
