import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerAuthClient } from "./ssr-server";

export type AdminRole = "administrator" | "operator";

export type AuthorizedAdminUser = {
  id: string;
  email: string | null;
  role: AdminRole;
};

export type AdminAuthorization =
  | { status: "unauthenticated" }
  | { status: "unauthorized" }
  | { status: "authorized"; user: AuthorizedAdminUser };

function isAdminRole(role: string): role is AdminRole {
  return role === "administrator" || role === "operator";
}

export async function getAdminAuthorization(): Promise<AdminAuthorization> {
  const supabase = await createSupabaseServerAuthClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (authError.name === "AuthSessionMissingError") {
      return { status: "unauthenticated" };
    }

    console.error("Admin identity validation failed", authError.name);
    return { status: "unauthorized" };
  }

  if (!authData.user) {
    return { status: "unauthenticated" };
  }

  let staffRecord: { role: string; active: boolean } | null;

  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("role, active")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (error) {
      console.error("Admin role lookup failed", error.code);
      return { status: "unauthorized" };
    }

    staffRecord = data;
  } catch (error) {
    console.error(
      "Admin role lookup failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return { status: "unauthorized" };
  }

  if (!staffRecord || staffRecord.active !== true) {
    return { status: "unauthorized" };
  }

  if (!isAdminRole(staffRecord.role)) {
    return { status: "unauthorized" };
  }

  return {
    status: "authorized",
    user: {
      id: authData.user.id,
      email: authData.user.email ?? null,
      role: staffRecord.role,
    },
  };
}

export async function requireActiveAdminUser() {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    redirect("/admin/login");
  }

  if (authorization.status === "unauthorized") {
    redirect("/admin/access-denied");
  }

  return authorization.user;
}

export async function requireAdministrator() {
  const user = await requireActiveAdminUser();

  if (user.role !== "administrator") {
    redirect("/admin/access-denied");
  }

  return user;
}

export async function requireOperator() {
  // Administrator access includes the operator-level capability set.
  return requireActiveAdminUser();
}
