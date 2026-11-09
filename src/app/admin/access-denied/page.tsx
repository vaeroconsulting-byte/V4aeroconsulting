import { signOutAction } from "../actions";

export default function AdminAccessDeniedPage() {
  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card" aria-labelledby="access-denied-title">
        <div className="admin-brand" aria-label="V4 Aero Consulting">
          <span className="admin-brand__mark" aria-hidden="true">
            V4
          </span>
          <span>V4 Aero Consulting</span>
        </div>

        <p className="admin-eyebrow">Acesso restrito</p>
        <h1 className="admin-auth-title" id="access-denied-title">
          Acesso não autorizado
        </h1>
        <p className="admin-auth-description">
          Esta conta não possui uma autorização administrativa ativa.
        </p>

        <form action={signOutAction}>
          <button className="admin-submit" type="submit">
            Encerrar sessão
          </button>
        </form>
      </section>
    </main>
  );
}
