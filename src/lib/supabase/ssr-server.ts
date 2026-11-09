import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { AdminAuthDatabase } from "@/types/admin-auth-database";
import { getSupabasePublicConfig } from "./public-config";

export async function createSupabaseServerAuthClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, publishableKey } = getSupabasePublicConfig();

  return createServerClient<AdminAuthDatabase>(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies; src/proxy.ts persists refreshes.
        }
      },
    },
  });
}
