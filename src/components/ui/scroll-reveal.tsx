"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
}

export function ScrollReveal({ children }: ScrollRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const targets = root.querySelectorAll<HTMLElement>("[data-scroll-reveal]");
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (
      prefersReducedMotion ||
      targets.length === 0 ||
      !("IntersectionObserver" in window)
    ) {
      targets.forEach((target) => {
        target.dataset.scrollRevealed = "true";
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target instanceof HTMLElement) {
            entry.target.dataset.scrollRevealed = "true";
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -48px 0px", threshold: 0.12 },
    );

    root.dataset.scrollRevealReady = "true";
    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="scroll-reveal-root" ref={rootRef}>
      {children}
    </div>
  );
}
