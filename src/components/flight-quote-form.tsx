"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  useRef,
  type FormEvent,
} from "react";
import {
  addDaysToLocalDate,
  formatLocalDate,
  parseLocalDateKey,
  toLocalDateKey,
} from "@/lib/dates";
import type { FlightQuoteRequest, TripType } from "@/types/flight-quote";
import CalendarThree from "@/components/ui/calendar-03";
import { buildFlightQuoteMessage, createWhatsAppUrl } from "@/lib/contact";

const subscribeToLocalDate = () => () => {};
const getServerLocalDate = () => "";
const getClientLocalDate = () => toLocalDateKey(new Date());

type JourneySummary = Pick<
  FlightQuoteRequest,
  "origin" | "destination" | "passengers" | "tripType"
>;

function readText(formData: FormData, name: string, limit: number): string {
  return String(formData.get(name) ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, limit);
}

export function FlightQuoteForm() {
  const today = useSyncExternalStore(
    subscribeToLocalDate,
    getClientLocalDate,
    getServerLocalDate,
  );
  const [tripType, setTripType] = useState<TripType>("round-trip");
  const [departureDateValue, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("09:00");
  const [returnDateValue, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("17:00");
  const [currentStep, setCurrentStep] = useState(1);
  const [formRevision, setFormRevision] = useState(0);
  const [isFormReady, setIsFormReady] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [journeySummary, setJourneySummary] = useState<JourneySummary>({
    origin: "",
    destination: "",
    passengers: 1,
    tripType: "round-trip",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const [openCalendar, setOpenCalendar] = useState<"departure" | "return" | null>(null);
  const [formError, setFormError] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [whatsAppUrl, setWhatsAppUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const departureDate = departureDateValue;
  const returnDate = returnDateValue;

  const minimumReturnDate = departureDate
    ? addDaysToLocalDate(departureDate, 1)
    : addDaysToLocalDate(today, 1);
  const steps = [
    { number: "01", label: "Sua viagem", title: "Para onde vamos?", description: "Comece informando os detalhes do seu itinerário." },
    { number: "02", label: "Datas e horários", title: "Quando deseja viajar?", description: "Informe suas datas e preferências de horário." },
    { number: "03", label: "Identificação", title: "Quem está solicitando o voo?", description: "Precisamos de algumas informações para preparar sua cotação." },
  ] as const;
  const activeStep = steps[currentStep - 1];

  function clearFormFeedback() {
    setFormError("");
    setFormStatus("");
    setWhatsAppUrl("");
  }

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      if (!(field in current)) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
    clearFormFeedback();
  }

  function handleDepartureDateChange(value: string) {
    const selectedDate = parseLocalDateKey(value);
    const minimumDate = parseLocalDateKey(today);

    if (!selectedDate || !minimumDate || selectedDate < minimumDate) {
      return;
    }

    clearFieldError("departureDate");
    setDepartureDate(value);

    if (returnDate && returnDate <= value) {
      setReturnDate("");
      clearFieldError("returnDate");
    }
  }

  function handleReturnDateChange(value: string) {
    if (!parseLocalDateKey(value) || value < minimumReturnDate) {
      return;
    }

    clearFieldError("returnDate");
    setReturnDate(value);
  }

  function handleTripTypeChange(nextTripType: TripType) {
    clearFormFeedback();
    clearFieldError("returnDate");
    clearFieldError("returnTime");
    setTripType(nextTripType);

    setOpenCalendar(null);
  }

  const validateStep = useCallback((
    step: number,
    formData: FormData,
    form: HTMLFormElement,
  ): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!readText(formData, "origin", 100)) {
        errors.origin = "Informe a origem.";
      }
      if (!readText(formData, "destination", 100)) {
        errors.destination = "Informe o destino.";
      }

      const passengers = Number(formData.get("passengers"));
      if (!Number.isSafeInteger(passengers) || passengers < 1) {
        errors.passengers = "Informe pelo menos um passageiro.";
      }
    }

    if (step === 2) {
      const departure = parseLocalDateKey(departureDate);
      const minimum = parseLocalDateKey(today);

      if (!departure || !minimum || departure < minimum) {
        errors.departureDate = "Selecione uma data de partida válida.";
      }
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(departureTime)) {
        errors.departureTime = "Informe um horário de partida válido.";
      }

      if (tripType === "round-trip") {
        const returnDateKey = parseLocalDateKey(returnDate);
        if (
          !departure ||
          !returnDateKey ||
          returnDateKey <= departure
        ) {
          errors.returnDate =
            "A data de retorno deve ser posterior à data de partida.";
        }
        if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(returnTime)) {
          errors.returnTime = "Informe um horário de retorno válido.";
        }
      }
    }

    if (step === 3) {
      if (!readText(formData, "requesterName", 120)) {
        errors.requesterName = "Informe seu nome completo.";
      }

      const phone = readText(formData, "phone", 25);
      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length < 8 || phoneDigits.length > 15) {
        errors.phone = "Informe um telefone com DDD e código do país.";
      }

      const emailField = form.elements.namedItem("email");
      if (
        emailField instanceof HTMLInputElement &&
        emailField.value.trim() &&
        emailField.validity.typeMismatch
      ) {
        errors.email = "Informe um e-mail válido ou deixe o campo em branco.";
      }
    }

    return errors;
  }, [departureDate, departureTime, returnDate, returnTime, today, tripType]);

  function validateRequesterField(field: string) {
    const form = formRef.current;
    if (!form) {
      return;
    }

    const error = validateStep(3, new FormData(form), form)[field];
    setFieldErrors((current) => {
      const next = { ...current };
      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }
      return next;
    });
  }

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      setIsFormReady(false);
      return;
    }

    const formData = new FormData(form);
    const isValid = [1, 2, 3].every(
      (step) => Object.keys(validateStep(step, formData, form)).length === 0,
    );
    setIsFormReady((current) => (current === isValid ? current : isValid));
  }, [
    currentStep,
    departureDate,
    departureTime,
    formRevision,
    returnDate,
    returnTime,
    today,
    tripType,
    validateStep,
  ]);

  function handleContinue(step: number) {
    const form = formRef.current;
    if (!form) {
      return;
    }

    clearFormFeedback();
    const errors = validateStep(step, new FormData(form), form);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      focusFirstError(Object.keys(errors)[0], form);
      return;
    }

    if (step === 1) {
      const formData = new FormData(form);
      setJourneySummary({
        origin: readText(formData, "origin", 100),
        destination: readText(formData, "destination", 100),
        passengers: Number(formData.get("passengers")),
        tripType,
      });
    }

    setCurrentStep(step + 1);
  }

  function focusFirstError(field: string, form: HTMLFormElement) {
    const fieldIds: Record<string, string> = {
      departureDate: "flight-departure-date-trigger",
      departureTime: "flight-departure-date",
      returnDate: "flight-return-date-trigger",
      returnTime: "flight-return-date",
    };
    const target = fieldIds[field]
      ? document.getElementById(fieldIds[field])
      : form.querySelector<HTMLElement>(`[name="${field}"]`);

    window.setTimeout(() => target?.focus(), 0);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFormFeedback();

    const form = event.currentTarget;
    const formData = new FormData(form);
    for (const step of [1, 2, 3]) {
      const errors = validateStep(step, formData, form);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setCurrentStep(step);
        focusFirstError(Object.keys(errors)[0], form);
        return;
      }
    }

    setFieldErrors({});
    const origin = readText(formData, "origin", 100);
    const destination = readText(formData, "destination", 100);
    const requesterName = readText(formData, "requesterName", 120);
    const organization = readText(formData, "organization", 120);
    const phone = readText(formData, "phone", 25);
    const email = readText(formData, "email", 254);
    const observations = String(formData.get("observations") ?? "")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
      .trim()
      .slice(0, 1000);
    const passengersValue = Number(formData.get("passengers"));
    const departureDateValue = departureDate;
    const departureTimeValue = String(formData.get("departureTime") ?? "");

    const request: FlightQuoteRequest = {
      origin,
      destination,
      passengers: passengersValue,
      tripType,
      departureDate: departureDateValue,
      departureTime: departureTimeValue,
      requesterName,
      organization,
      phone,
      email,
      observations,
    };

    if (tripType === "round-trip") {
      request.returnDate = returnDate;
      request.returnTime = returnTime;
    }

    const url = createWhatsAppUrl(buildFlightQuoteMessage(request));
    setIsSubmitting(true);

    const whatsappWindow = window.open(url, "_blank");

    if (!whatsappWindow) {
      setWhatsAppUrl(url);
      setFormError(
        "O navegador bloqueou a nova janela. Use o link abaixo para abrir o WhatsApp.",
      );
      setIsSubmitting(false);
      return;
    }

    whatsappWindow.opener = null;
    setFormStatus(
      "O WhatsApp foi aberto. A solicitação ainda não foi enviada; confira os dados e confirme o envio por lá.",
    );
    setIsSubmitting(false);
  }

  return (
    <div className="flight-quote">
      <div className="flight-quote__intro">
        <p className="eyebrow">Solicitação de voo</p>
        <ol className="flight-stepper" aria-label="Progresso da solicitação">
          {steps.map((step, index) => (
            <li
              className="flight-stepper__step"
              data-state={
                index + 1 < currentStep
                  ? "complete"
                  : index + 1 === currentStep
                    ? "current"
                    : "upcoming"
              }
              aria-current={index + 1 === currentStep ? "step" : undefined}
              key={step.number}
            >
              <span className="flight-stepper__number" aria-hidden="true">
                {index + 1 < currentStep ? "✓" : step.number}
              </span>
              <span className="flight-stepper__label">{step.label}</span>
            </li>
          ))}
        </ol>
        <h3 className="flight-quote__title" aria-live="polite">
          {activeStep.title}
        </h3>
        <p className="flight-quote__description">{activeStep.description}</p>
      </div>

      <form
        className="flight-form"
        ref={formRef}
        noValidate
        onChange={() => setFormRevision((revision) => revision + 1)}
        onSubmit={handleSubmit}
      >
        <section
          className="flight-form__step"
          data-active={currentStep === 1}
          hidden={currentStep !== 1}
          aria-labelledby="flight-step-trip-title"
        >
          <h4 className="flight-form__step-title" id="flight-step-trip-title">
            Sua viagem
          </h4>
          <div className="flight-form__route">
            <div className="flight-form__field">
              <label className="flight-form__label" htmlFor="flight-origin">
                Origem <span className="flight-form__required" aria-hidden="true">*</span>
              </label>
              <input
                className="flight-form__input"
                id="flight-origin"
                name="origin"
                type="text"
                autoComplete="address-level2"
                placeholder="Cidade ou aeroporto"
                maxLength={100}
                required
                aria-invalid={Boolean(fieldErrors.origin)}
                aria-describedby={fieldErrors.origin ? "flight-origin-error" : undefined}
                onChange={() => clearFieldError("origin")}
              />
              {fieldErrors.origin ? (
                <p className="flight-form__field-error" id="flight-origin-error">
                  {fieldErrors.origin}
                </p>
              ) : null}
            </div>
            <div className="flight-form__field">
              <label className="flight-form__label" htmlFor="flight-destination">
                Destino <span className="flight-form__required" aria-hidden="true">*</span>
              </label>
              <input
                className="flight-form__input"
                id="flight-destination"
                name="destination"
                type="text"
                autoComplete="address-level2"
                placeholder="Cidade ou aeroporto"
                maxLength={100}
                required
                aria-invalid={Boolean(fieldErrors.destination)}
                aria-describedby={
                  fieldErrors.destination ? "flight-destination-error" : undefined
                }
                onChange={() => clearFieldError("destination")}
              />
              {fieldErrors.destination ? (
                <p
                  className="flight-form__field-error"
                  id="flight-destination-error"
                >
                  {fieldErrors.destination}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flight-form__trip-options">
            <fieldset className="flight-form__trip-fieldset">
              <legend className="flight-form__label">Tipo de viagem</legend>
              <div className="flight-form__trip-choice">
                <label>
                  <input
                    type="radio"
                    name="tripType"
                    value="round-trip"
                    checked={tripType === "round-trip"}
                    onChange={() => handleTripTypeChange("round-trip")}
                  />
                  <span>Ida e volta</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="tripType"
                    value="one-way"
                    checked={tripType === "one-way"}
                    onChange={() => handleTripTypeChange("one-way")}
                  />
                  <span>Somente ida</span>
                </label>
              </div>
              {fieldErrors.tripType ? (
                <p className="flight-form__field-error">{fieldErrors.tripType}</p>
              ) : null}
            </fieldset>
            <div className="flight-form__field flight-form__passengers">
              <label className="flight-form__label" htmlFor="flight-passengers">
                Passageiros <span className="flight-form__required" aria-hidden="true">*</span>
              </label>
              <input
                className="flight-form__input"
                id="flight-passengers"
                name="passengers"
                type="number"
                min={1}
                step={1}
                defaultValue={1}
                required
                aria-invalid={Boolean(fieldErrors.passengers)}
                aria-describedby={
                  fieldErrors.passengers ? "flight-passengers-error" : undefined
                }
                onChange={() => clearFieldError("passengers")}
              />
              {fieldErrors.passengers ? (
                <p
                  className="flight-form__field-error"
                  id="flight-passengers-error"
                >
                  {fieldErrors.passengers}
                </p>
              ) : null}
            </div>
          </div>
          <button
            className="button button--accent flight-form__step-action"
            type="button"
            onClick={() => handleContinue(1)}
          >
            Continuar <span aria-hidden="true">→</span>
          </button>
        </section>

        <section
          className="flight-form__step"
          data-active={currentStep === 2}
          hidden={currentStep !== 2}
          aria-labelledby="flight-step-dates-title"
        >
          <h4 className="flight-form__step-title" id="flight-step-dates-title">
            Datas e horários
          </h4>
          <div className="flight-form__journey">
            <fieldset className="flight-form__journey-leg">
              <legend className="flight-form__journey-title">Partida</legend>
              <CalendarThree
                id="flight-departure-date"
                label="Data de partida *"
                name="departureDate"
                timeName="departureTime"
                value={departureDate}
                minimumDate={today}
                todayDate={today}
                selectedTime={departureTime}
                dateError={fieldErrors.departureDate}
                timeError={fieldErrors.departureTime}
                open={openCalendar === "departure"}
                onOpen={() => setOpenCalendar("departure")}
                onClose={() => setOpenCalendar(null)}
                onDateChange={handleDepartureDateChange}
                onTimeChange={(value) => {
                  clearFieldError("departureTime");
                  setDepartureTime(value);
                }}
              />
              {fieldErrors.departureDate ? (
                <p
                  className="flight-form__field-error"
                  id="flight-departure-date-error"
                >
                  {fieldErrors.departureDate}
                </p>
              ) : null}
              {fieldErrors.departureTime ? (
                <p
                  className="flight-form__field-error"
                  id="flight-departure-time-error"
                >
                  {fieldErrors.departureTime}
                </p>
              ) : null}
            </fieldset>

            {tripType === "round-trip" ? (
              <fieldset className="flight-form__journey-leg">
                <legend className="flight-form__journey-title">Retorno</legend>
                <CalendarThree
                  id="flight-return-date"
                  label="Data de retorno *"
                  name="returnDate"
                  timeName="returnTime"
                  value={returnDate}
                  minimumDate={minimumReturnDate}
                  todayDate={today}
                  selectedTime={returnTime}
                  dateError={fieldErrors.returnDate}
                  timeError={fieldErrors.returnTime}
                  open={openCalendar === "return"}
                  onOpen={() => setOpenCalendar("return")}
                  onClose={() => setOpenCalendar(null)}
                  onDateChange={handleReturnDateChange}
                  onTimeChange={(value) => {
                    clearFieldError("returnTime");
                    setReturnTime(value);
                  }}
                />
                {fieldErrors.returnDate ? (
                  <p
                    className="flight-form__field-error"
                    id="flight-return-date-error"
                  >
                    {fieldErrors.returnDate}
                  </p>
                ) : null}
                {fieldErrors.returnTime ? (
                  <p
                    className="flight-form__field-error"
                    id="flight-return-time-error"
                  >
                    {fieldErrors.returnTime}
                  </p>
                ) : null}
              </fieldset>
            ) : null}
          </div>
          <p className="flight-form__notice">
            Horários são preferências e não representam disponibilidade
            confirmada.
          </p>
          <div className="flight-form__step-actions">
            <button
              className="button button--outline flight-form__back"
              type="button"
              onClick={() => {
                clearFormFeedback();
                setCurrentStep(1);
              }}
            >
              <span aria-hidden="true">←</span> Voltar
            </button>
            <button
              className="button button--accent flight-form__step-action"
              type="button"
              onClick={() => handleContinue(2)}
            >
              Continuar <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        <section
          className="flight-form__step"
          data-active={currentStep === 3}
          hidden={currentStep !== 3}
          aria-labelledby="flight-step-requester-title"
        >
          <h4 className="flight-form__step-title" id="flight-step-requester-title">
            Identificação do solicitante
          </h4>
          <dl className="flight-summary">
            <div className="flight-summary__route">
              <dt>Itinerário</dt>
              <dd>
                {journeySummary.origin} <span aria-hidden="true">→</span>{" "}
                {journeySummary.destination}
              </dd>
            </div>
            <div>
              <dt>Viagem</dt>
              <dd>
                {tripType === "round-trip" ? "Ida e volta" : "Somente ida"} ·{" "}
                {journeySummary.passengers}{" "}
                {journeySummary.passengers === 1 ? "passageiro" : "passageiros"}
              </dd>
            </div>
            <div>
              <dt>Partida</dt>
              <dd>
                {formatLocalDate(departureDate)} às {departureTime.replace(":", "h")}
              </dd>
            </div>
            {tripType === "round-trip" ? (
              <div>
                <dt>Retorno</dt>
                <dd>
                  {formatLocalDate(returnDate)} às {returnTime.replace(":", "h")}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="flight-form__requester">
            <div className="flight-form__field">
              <label className="flight-form__label" htmlFor="flight-requester-name">
                Nome completo <span className="flight-form__required" aria-hidden="true">*</span>
              </label>
              <input
                className="flight-form__input"
                id="flight-requester-name"
                name="requesterName"
                type="text"
                autoComplete="name"
                maxLength={120}
                required
                aria-invalid={Boolean(fieldErrors.requesterName)}
                aria-describedby={
                  fieldErrors.requesterName ? "flight-requester-name-error" : undefined
                }
                onChange={() => clearFieldError("requesterName")}
                onBlur={() => validateRequesterField("requesterName")}
              />
              {fieldErrors.requesterName ? (
                <p
                  className="flight-form__field-error"
                  id="flight-requester-name-error"
                >
                  {fieldErrors.requesterName}
                </p>
              ) : null}
            </div>
            <div className="flight-form__field">
              <label className="flight-form__label" htmlFor="flight-organization">
                Empresa / Organização <span>(opcional)</span>
              </label>
              <input
                className="flight-form__input"
                id="flight-organization"
                name="organization"
                type="text"
                autoComplete="organization"
                maxLength={120}
                onChange={clearFormFeedback}
              />
            </div>
            <div className="flight-form__field">
              <label className="flight-form__label" htmlFor="flight-phone">
                Telefone / WhatsApp <span className="flight-form__required" aria-hidden="true">*</span>
              </label>
              <input
                className="flight-form__input"
                id="flight-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={25}
                required
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? "flight-phone-error" : undefined}
                onChange={() => clearFieldError("phone")}
                onBlur={() => validateRequesterField("phone")}
              />
              {fieldErrors.phone ? (
                <p className="flight-form__field-error" id="flight-phone-error">
                  {fieldErrors.phone}
                </p>
              ) : null}
            </div>
            <div className="flight-form__field">
              <label className="flight-form__label" htmlFor="flight-email">
                E-mail <span>(opcional)</span>
              </label>
              <input
                className="flight-form__input"
                id="flight-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "flight-email-error" : undefined}
                onChange={() => clearFieldError("email")}
                onBlur={() => validateRequesterField("email")}
              />
              {fieldErrors.email ? (
                <p className="flight-form__field-error" id="flight-email-error">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flight-form__field">
            <label className="flight-form__label" htmlFor="flight-observations">
              Observações adicionais <span>(opcional)</span>
            </label>
            <textarea
              className="flight-form__input flight-form__textarea"
              id="flight-observations"
              name="observations"
              rows={2}
              maxLength={1000}
              placeholder="Inclua informações relevantes para a cotação"
              onChange={clearFormFeedback}
            />
          </div>
          <div className="flight-form__step-actions">
            <button
              className="button button--outline flight-form__back"
              type="button"
              onClick={() => {
                clearFormFeedback();
                setCurrentStep(2);
              }}
            >
              <span aria-hidden="true">←</span> Voltar
            </button>
            <button
              className="button button--accent flight-form__submit"
              type="submit"
              disabled={isSubmitting || !isFormReady}
            >
              {isSubmitting
                ? "Abrindo WhatsApp..."
                : "Enviar solicitação pelo WhatsApp"}
            </button>
          </div>
        </section>

        {formError ? (
          <p className="flight-form__error" role="alert">
            {formError}
          </p>
        ) : null}
        {formStatus ? (
          <p className="flight-form__status" role="status" aria-live="polite">
            {formStatus}
          </p>
        ) : null}
        {whatsAppUrl ? (
          <a
            className="flight-form__fallback-link"
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir solicitação no WhatsApp
          </a>
        ) : null}

      </form>
    </div>
  );
}
