"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerAuthClient } from "@/lib/supabase/ssr-server";

export async function signOutAction() {
  const supabase = await createSupabaseServerAuthClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    throw new Error("Não foi possível encerrar a sessão administrativa.");
  }

  redirect("/admin/login");
}
