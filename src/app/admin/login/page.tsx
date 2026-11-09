import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Entrar | V4 Aero Consulting",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLoginPage() {
  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card" aria-labelledby="admin-login-title">
        <div className="admin-brand" aria-label="V4 Aero Consulting">
          <span className="admin-brand__mark" aria-hidden="true">
            V4
          </span>
          <span>V4 Aero Consulting</span>
        </div>

        <p className="admin-eyebrow">Área administrativa</p>
        <h1 className="admin-auth-title" id="admin-login-title">
          Acesse sua conta
        </h1>
        <p className="admin-auth-description">
          Entre com as credenciais da sua conta autorizada.
        </p>

        <LoginForm />

        <p className="admin-auth-footer">
          O acesso é restrito a usuários provisionados pela equipe.
        </p>
      </section>
    </main>
  );
}
