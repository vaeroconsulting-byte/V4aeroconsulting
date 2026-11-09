import {
  ContactSection,
  DestinationsSection,
  FlightRequestSection,
  FleetSection,
  InstitutionSection,
  ServicesSection,
} from "@/components/home-sections";
import { DemoOne } from "@/components/ui/demo";
import { ResponsiveHeroBanner } from "@/components/ui/responsive-hero-banner";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { FlightQuoteForm } from "@/components/flight-quote-form";
import { SiteFooter } from "@/components/site-footer";

export function HomePage() {
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <main id="conteudo">
        <ResponsiveHeroBanner
          badgeLabel="Apresentação"
          badgeText="Conteúdo demonstrativo"
          title="Sua próxima jornada"
          titleLine2="começa aqui."
          description="Soluções em transporte aéreo com atendimento personalizado e foco nas necessidades de cada viagem."
          primaryButtonText="Solicitar um voo"
          secondaryButtonText="Conhecer nossa frota"
          ctaButtonText="Solicitar orçamento"
          quoteForm={<FlightQuoteForm />}
        />
        <DemoOne />
        <ScrollReveal>
          <InstitutionSection />
          <ServicesSection />
          <DestinationsSection />
          <FleetSection />
          <FlightRequestSection />
          <ContactSection />
        </ScrollReveal>
      </main>
      <SiteFooter />
    </>
  );
}
