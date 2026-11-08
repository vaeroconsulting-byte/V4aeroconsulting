import { V4Logo } from "@/components/ui/v4-logo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a className="brand" href="#inicio" aria-label="V4 Aero Consulting, início">
          <V4Logo className="brand__logo" preload />
        </a>
        <nav className="site-nav" aria-label="Navegação principal">
          <a href="#empresa">Empresa</a>
          <a href="#servicos">Serviços</a>
          <a href="#frota">Frota</a>
          <a className="button button--accent site-nav__cta" href="#solicitar">
            Solicitar voo
          </a>
        </nav>
      </div>
    </header>
  );
}
