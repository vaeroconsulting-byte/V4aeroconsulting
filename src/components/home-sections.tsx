import Image from "next/image";
import { fleetExamples, flightRequestSteps, services } from "@/data/homepage";
import { WHATSAPP_DEMO_URL } from "@/lib/contact";
import { SectionHeading } from "@/components/section-heading";
import { FlightQuoteForm } from "@/components/flight-quote-form";

export function InstitutionSection() {
  return (
    <section className="section section--surface" id="empresa">
      <div className="container">
        <div className="institution">
          <div className="institution__intro">
            <p className="eyebrow">Apresentação institucional</p>
            <h2 className="institution__title">
              A identidade da empresa começa pela sua história.
            </h2>
            <p className="institution__copy">
              Esta apresentação será construída com a trajetória, a proposta e
              a atuação da empresa no setor aeronáutico. O texto abaixo é
              demonstrativo e deverá ser substituído após o briefing.
            </p>
          </div>
          <div className="institution__visual">
            <Image
              src="/images/aircraft-tarmac.webp"
              alt="Aeronave estacionada em um pátio aeroportuário, fotografia ilustrativa."
              fill
              quality={85}
              sizes="(max-width: 760px) 100vw, 45vw"
            />
            <span className="institution__visual-label">
              Fotografia ilustrativa; imagem não representa a operação da
              empresa.
            </span>
          </div>
        </div>
        <div className="institution__details" aria-label="Informações institucionais demonstrativas">
          <article className="institution__detail">
            <h3 className="institution__detail-title">Posicionamento</h3>
            <p>
              Espaço para apresentar como a empresa se posiciona no setor
              aeronáutico, com conteúdo a confirmar.
            </p>
          </article>
          <article className="institution__detail">
            <h3 className="institution__detail-title">Diferenciais</h3>
            <p>
              Atributos e compromissos serão descritos somente após validação
              das informações oficiais.
            </p>
          </article>
          <article className="institution__detail">
            <h3 className="institution__detail-title">Área de atuação</h3>
            <p>
              Regiões e mercados atendidos serão informados quando forem
              confirmados pela empresa.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

export function ServicesSection() {
  return (
    <section className="section" id="servicos">
      <div className="container">
        <SectionHeading
          eyebrow="Serviços"
          title="Possibilidades para cada jornada."
          description="Conheça algumas categorias de referência para a apresentação dos serviços da empresa."
          note="Categorias e textos demonstrativos; não representam uma confirmação dos serviços oferecidos."
        />
        <div className="experience-layout" id="experiencia">
          <div className="experience-layout__visual">
            <Image
              src="/images/aircraft-wing.webp"
              alt="Vista da asa de uma aeronave acima das nuvens, imagem ilustrativa."
              fill
              quality={85}
              sizes="(max-width: 760px) 100vw, 50vw"
            />
            <span>Imagem ilustrativa</span>
          </div>
          <div className="experience-layout__list">
            {services.map((service, index) => (
              <article className="experience-item" key={service.title}>
                <span className="experience-item__index" aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="service-card__title">{service.title}</h3>
                  <p className="service-card__description">
                    {service.description}
                  </p>
                  <a className="service-card__link" href="#solicitar">
                    Solicitar informações <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function DestinationsSection() {
  return (
    <section className="section section--destinations" id="destinos">
      <div className="container destinations-panel">
        <div>
          <p className="eyebrow">Destinos</p>
          <h2 className="destinations-panel__title">
            Novos horizontes, no seu tempo.
          </h2>
          <p className="destinations-panel__description">
            As regiões atendidas serão apresentadas após confirmação das
            informações oficiais da empresa.
          </p>
        </div>
        <a className="button button--outline" href="#solicitar">
          Planejar uma viagem <span aria-hidden="true">↗</span>
        </a>
        <span className="destinations-panel__note">
          Conteúdo demonstrativo. Destinos ainda não confirmados.
        </span>
      </div>
    </section>
  );
}

export function FleetSection() {
  return (
    <section className="section section--deep" id="frota">
      <div className="container">
        <SectionHeading
          eyebrow="Frota"
          title="Conheça as aeronaves."
          description="Uma prévia visual de como modelos, imagens e informações poderão ser apresentados."
          note="Aeronaves e fotografias abaixo são apenas demonstrativas. Não representam a frota ou disponibilidade reais."
        />
        <div className="fleet-grid">
          {fleetExamples.map((aircraft) => (
            <article className="fleet-card" key={aircraft.title}>
              <div className="fleet-card__image">
                <Image
                  src={aircraft.image}
                  alt={aircraft.alt}
                  fill
                  quality={85}
                  sizes="(max-width: 520px) 100vw, (max-width: 760px) 50vw, 33vw"
                />
                <span className="fleet-card__label">Imagem ilustrativa</span>
              </div>
              <div className="fleet-card__body">
                <h3 className="fleet-card__title">{aircraft.title}</h3>
                <p className="fleet-card__description">
                  Categoria e especificações a confirmar.
                </p>
                <a className="service-card__link" href="#solicitar">
                  Solicitar informações <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FlightRequestSection() {
  return (
    <section className="section" id="como-funciona">
      <div className="container">
        <SectionHeading
          eyebrow="Solicitação de voo"
          title="Do primeiro contato aos próximos passos."
          description="Uma explicação simples do fluxo ajuda a alinhar expectativas desde o início."
          note="Etapas demonstrativas; o processo oficial deverá ser validado com a empresa."
        />
        <div className="process-grid">
          {flightRequestSteps.map((step) => (
            <article className="process-step" key={step.title}>
              <h3 className="process-step__title">{step.title}</h3>
              <p className="process-step__description">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FlightQuoteSection() {
  return (
    <section className="flight-quote-section" id="solicitar">
      <div className="container">
        <FlightQuoteForm />
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section className="section section--surface">
      <div className="container">
        <div className="contact" id="contato">
          <div>
            <p className="eyebrow">Contato</p>
            <h2 className="contact__title">Sua próxima conversa começa aqui.</h2>
            <p className="contact__description">
              Conte o que você precisa. Os canais oficiais e as informações de
              atendimento serão atualizados quando forem fornecidos.
            </p>
          </div>
          <div className="contact__action">
            <a
              className="button button--accent"
              href={WHATSAPP_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Solicitar voo pelo WhatsApp <span aria-hidden="true">↗</span>
            </a>
            <p className="demo-note">
              Link demonstrativo, ainda sem número oficial da empresa.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
