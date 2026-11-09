"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setErrorMessage("Informe seu e-mail e sua senha.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage("Não foi possível entrar. Verifique suas credenciais.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setErrorMessage("Não foi possível iniciar a sessão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label className="admin-field">
        <span>E-mail</span>
        <input
          autoComplete="username"
          name="email"
          type="email"
          required
          maxLength={254}
          disabled={isSubmitting}
        />
      </label>

      <label className="admin-field">
        <span>Senha</span>
        <input
          autoComplete="current-password"
          name="password"
          type="password"
          required
          maxLength={256}
          disabled={isSubmitting}
        />
      </label>

      {errorMessage ? (
        <p className="admin-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        className="admin-submit"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
