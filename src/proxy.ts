import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "./lib/supabase/public-config";

const SESSION_CACHE_HEADERS = ["cache-control", "expires", "pragma"];

function copySupabaseResponseState(
  target: NextResponse,
  source: NextResponse,
) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  SESSION_CACHE_HEADERS.forEach((header) => {
    const value = source.headers.get(header);
    if (value) {
      target.headers.set(header, value);
    }
  });
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { supabaseUrl, publishableKey } = getSupabasePublicConfig();
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([name, value]) => {
          supabaseResponse.headers.set(name, value);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginRoute = request.nextUrl.pathname === "/admin/login";
  const isAuthenticated = !error && Boolean(data?.claims?.sub);

  if (isAdminRoute && !isLoginRoute && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";

    const redirectResponse = NextResponse.redirect(loginUrl);
    copySupabaseResponseState(redirectResponse, supabaseResponse);
    return redirectResponse;
  }

  if (isLoginRoute && isAuthenticated) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin";
    adminUrl.search = "";

    const redirectResponse = NextResponse.redirect(adminUrl);
    copySupabaseResponseState(redirectResponse, supabaseResponse);
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*"],
};
