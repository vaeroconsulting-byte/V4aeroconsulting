"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { V4Logo } from "@/components/ui/v4-logo";

const navigationLinks = [
  { label: "Frota", href: "#frota" },
  { label: "Experiência", href: "#experiencia" },
  { label: "Destinos", href: "#destinos" },
  { label: "Contato", href: "#contato" },
] as const;

export interface ResponsiveHeroBannerProps {
  badgeLabel?: string;
  badgeText?: string;
  title?: string;
  titleLine2?: string;
  description?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  ctaButtonText?: string;
  quoteForm?: ReactNode;
}

export function ResponsiveHeroBanner({
  badgeLabel = "Apresentação",
  badgeText = "Conteúdo demonstrativo",
  title = "Sua próxima jornada",
  titleLine2 = "começa aqui.",
  description = "Soluções em transporte aéreo com atendimento personalizado e foco nas necessidades de cada viagem.",
  primaryButtonText = "Solicitar um voo",
  secondaryButtonText = "Conhecer nossa frota",
  ctaButtonText = "Solicitar orçamento",
  quoteForm,
}: ResponsiveHeroBannerProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function updateScrollState() {
      const shouldCollapse = window.scrollY > 80;
      setIsScrolled((current) =>
        current === shouldCollapse ? current : shouldCollapse,
      );
    }

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useEffect(() => {
    const sections = navigationLinks
      .map(({ href }) => document.querySelector<HTMLElement>(href))
      .filter((section): section is HTMLElement => section !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visibleSection) {
          setActiveSection(`#${visibleSection.target.id}`);
        }
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.15, 0.4] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        !navigationRef.current?.contains(target) &&
        !menuToggleRef.current?.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [isMenuOpen]);

  function closeMenu() {
    setIsMenuOpen(false);
    if (isMenuOpen) {
      menuToggleRef.current?.focus();
    }
  }

  return (
    <section className="responsive-hero" id="inicio">
      <Image
        className="responsive-hero__image"
        src="/images/aircraft-sunset.webp"
        alt=""
        fill
        preload
        quality={85}
        sizes="100vw"
      />
      <div className="responsive-hero__overlay" aria-hidden="true" />

      <header
        className={`responsive-hero__header${isScrolled ? " is-scrolled" : ""}`}
      >
        <div className="responsive-hero__header-inner">
          <a
            className="responsive-hero__brand"
            href="#inicio"
            aria-label="V4 Aero Consulting, início"
            onClick={closeMenu}
          >
            <V4Logo className="responsive-hero__logo" preload />
          </a>

          <button
            ref={menuToggleRef}
            className="responsive-hero__menu-toggle"
            type="button"
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>

          <nav
            ref={navigationRef}
            className="responsive-hero__navigation"
            id="primary-navigation"
            aria-label="Navegação principal"
            data-open={isMenuOpen}
          >
            <div className="responsive-hero__nav-links">
              {navigationLinks.map((link) => (
                <a
                  className="responsive-hero__nav-link"
                  href={link.href}
                  key={link.href}
                  aria-current={activeSection === link.href ? "location" : undefined}
                  onClick={closeMenu}
                >
                  {link.label}
                </a>
              ))}
            </div>
            <a
              className="button button--accent responsive-hero__header-cta"
              href="#solicitar"
              onClick={closeMenu}
            >
              {ctaButtonText}
            </a>
          </nav>
        </div>
      </header>

      <div className="responsive-hero__content">
        <div className="responsive-hero__copy">
          <p className="responsive-hero__eyebrow">
            <span className="responsive-hero__badge-label">{badgeLabel}</span>
            <span>{badgeText}</span>
          </p>
          <h1 className="responsive-hero__title">
            {title}
            {titleLine2 ? (
              <>
                <br />
                {titleLine2}
              </>
            ) : null}
          </h1>
          <p className="responsive-hero__description">
            {description}
          </p>
          <div className="responsive-hero__actions">
            <a
              className="button button--accent"
              href="#solicitar"
              onClick={closeMenu}
            >
              {primaryButtonText}
            </a>
            <a
              className="button button--outline"
              href="#frota"
              onClick={closeMenu}
            >
              {secondaryButtonText}
            </a>
          </div>
          <p className="responsive-hero__note">
            Conteúdo demonstrativo. Informações institucionais serão atualizadas
            após validação pela empresa.
          </p>
        </div>
        {quoteForm ? (
          <div className="responsive-hero__quote" id="solicitar">
            {quoteForm}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default ResponsiveHeroBanner;
