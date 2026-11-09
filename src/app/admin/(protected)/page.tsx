import { signOutAction } from "../actions";

export default function AdminPage() {
  return (
    <main className="admin-page">
      <section className="admin-shell" aria-labelledby="admin-title">
        <header className="admin-header">
          <div className="admin-brand" aria-label="V4 Aero Consulting">
            <span className="admin-brand__mark" aria-hidden="true">
              V4
            </span>
            <span>V4 Aero Consulting</span>
          </div>
          <form action={signOutAction}>
            <button className="admin-logout" type="submit">
              Encerrar sessão
            </button>
          </form>
        </header>

        <div className="admin-welcome">
          <p className="admin-eyebrow">Área administrativa</p>
          <h1 id="admin-title">Acesso autorizado</h1>
          <p>
            Sua identidade e autorização foram validadas no servidor. As áreas
            administrativas serão habilitadas nas próximas etapas.
          </p>
        </div>
      </section>
    </main>
  );
}
