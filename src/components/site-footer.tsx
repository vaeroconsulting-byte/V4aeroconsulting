import { V4Logo } from "@/components/ui/v4-logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__top">
          <a className="brand" href="#inicio" aria-label="V4 Aero Consulting, início">
            <V4Logo className="brand__logo" />
          </a>
          <nav className="site-footer__nav" aria-label="Navegação do rodapé">
            <a href="#empresa">Empresa</a>
            <a href="#experiencia">Experiência</a>
            <a href="#destinos">Destinos</a>
            <a href="#frota">Frota demonstrativa</a>
            <a href="#contato">Contato</a>
          </nav>
        </div>
        <div className="site-footer__bottom">
          <p>Identidade e conteúdo demonstrativos; informações oficiais pendentes.</p>
          <p>
            Fotografias ilustrativas via{" "}
            <a
              className="site-footer__credit"
              href="https://unsplash.com/license"
              target="_blank"
              rel="noopener noreferrer"
            >
              Unsplash
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
