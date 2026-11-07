"use client";

import { ReactLenis } from "lenis/react";
import { forwardRef, useSyncExternalStore } from "react";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const mediaQuery = window.matchMedia(reducedMotionQuery);
  mediaQuery.addEventListener("change", onChange);

  return () => mediaQuery.removeEventListener("change", onChange);
}

function getMotionPreference() {
  return window.matchMedia(reducedMotionQuery).matches;
}

function getServerMotionPreference() {
  return true;
}

function smoothScrollPrevent(node: HTMLElement) {
  return node.closest("input, textarea, select, [data-lenis-prevent]") !== null;
}

const SmoothScroll = forwardRef<HTMLElement>(function SmoothScroll(_, ref) {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionPreference,
    getServerMotionPreference,
  );

  const content = (
    <article className="smooth-scroll__story">
      <section
        className="smooth-scroll__panel smooth-scroll__panel--intro"
        aria-labelledby="smooth-scroll-intro-title"
      >
        <div className="smooth-scroll__panel-content">
          <p className="smooth-scroll__eyebrow">Plataforma de aviação</p>
          <h2
            className="smooth-scroll__title"
            id="smooth-scroll-intro-title"
          >
            A aviação executiva começa com a escolha certa.
          </h2>
          <p className="smooth-scroll__description">
            Uma apresentação demonstrativa para conhecer a plataforma e iniciar
            o planejamento da sua próxima jornada.
          </p>
        </div>
      </section>

      <section
        className="smooth-scroll__panel smooth-scroll__panel--aircraft"
        aria-labelledby="smooth-scroll-aircraft-title"
      >
        <div className="smooth-scroll__panel-content">
          <p className="smooth-scroll__eyebrow">Aeronaves</p>
          <h2
            className="smooth-scroll__title"
            id="smooth-scroll-aircraft-title"
          >
            Encontre a aeronave ideal para sua jornada.
          </h2>
          <p className="smooth-scroll__description">
            Explore uma prévia demonstrativa de categorias e aeronaves. As
            informações da frota serão atualizadas após confirmação pela
            empresa.
          </p>
          <a className="button button--accent" href="#frota">
            Conhecer a prévia da frota
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <section
        className="smooth-scroll__panel smooth-scroll__panel--destination"
        aria-labelledby="smooth-scroll-destination-title"
      >
        <div className="smooth-scroll__panel-content">
          <p className="smooth-scroll__eyebrow">Sua próxima jornada</p>
          <h2
            className="smooth-scroll__title"
            id="smooth-scroll-destination-title"
            onPointerMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = ((event.clientX - bounds.left) / bounds.width) * 100;
              const y = ((event.clientY - bounds.top) / bounds.height) * 100;

              event.currentTarget.style.setProperty("--glow-x", `${x}%`);
              event.currentTarget.style.setProperty("--glow-y", `${y}%`);
            }}
            onPointerLeave={(event) => {
              event.currentTarget.style.removeProperty("--glow-x");
              event.currentTarget.style.removeProperty("--glow-y");
            }}
          >
            Seu próximo destino. Uma nova experiência.
          </h2>
          <p className="smooth-scroll__description">
            Compartilhe os detalhes da viagem no formulário demonstrativo de
            cotação. Nenhuma solicitação será enviada nesta etapa.
          </p>
          <a className="button button--light" href="#solicitar">
            Solicitar um voo
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    </article>
  );

  return (
    <section
      className="smooth-scroll"
      aria-label="Apresentação da plataforma"
      data-reduced-motion={prefersReducedMotion}
      ref={ref}
    >
      {prefersReducedMotion ? (
        content
      ) : (
        <ReactLenis
          root
          options={{
            autoRaf: true,
            anchors: true,
            prevent: smoothScrollPrevent,
          }}
        >
          {content}
        </ReactLenis>
      )}
    </section>
  );
});

SmoothScroll.displayName = "SmoothScroll";

export default SmoothScroll;
