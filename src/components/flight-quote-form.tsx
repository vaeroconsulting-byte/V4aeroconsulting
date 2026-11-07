"use client";

import {
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { addDaysToLocalDate, parseLocalDateKey, toLocalDateKey } from "@/lib/dates";
import type { FlightQuoteRequest, TripType } from "@/types/flight-quote";
import CalendarThree from "@/components/ui/calendar-03";
import { buildFlightQuoteMessage, createWhatsAppUrl } from "@/lib/contact";

const subscribeToLocalDate = () => () => {};
const getServerLocalDate = () => "";
const getClientLocalDate = () => toLocalDateKey(new Date());

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

  function clearFormFeedback() {
    setFormError("");
    setFormStatus("");
    setWhatsAppUrl("");
  }

  function handleDepartureDateChange(value: string) {
    const selectedDate = parseLocalDateKey(value);
    const minimumDate = parseLocalDateKey(today);

    if (!selectedDate || !minimumDate || selectedDate < minimumDate) {
      return;
    }

    clearFormFeedback();
    setDepartureDate(value);

    if (returnDate && returnDate <= value) {
      setReturnDate("");
    }
  }

  function handleReturnDateChange(value: string) {
    if (!parseLocalDateKey(value) || value < minimumReturnDate) {
      return;
    }

    clearFormFeedback();
    setReturnDate(value);
  }

  function handleTripTypeChange(nextTripType: TripType) {
    clearFormFeedback();
    setTripType(nextTripType);

    setOpenCalendar(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFormFeedback();

    const formData = new FormData(event.currentTarget);
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
    const departureDateValue = String(formData.get("departureDate") ?? "");
    const departureTimeValue = String(formData.get("departureTime") ?? "");
    const departure = parseLocalDateKey(departureDateValue);
    const minimum = parseLocalDateKey(today);
    const phoneDigits = phone.replace(/\D/g, "");

    if (
      !origin ||
      !destination ||
      !requesterName ||
      phoneDigits.length < 8 ||
      phoneDigits.length > 15 ||
      !Number.isSafeInteger(passengersValue) ||
      passengersValue < 1 ||
      !departure ||
      !minimum ||
      departure < minimum ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(departureTimeValue)
    ) {
      setFormError(
        "Confira os campos obrigatórios, o telefone, os passageiros e os dados de partida.",
      );
      return;
    }

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
      const returnDateValue = String(formData.get("returnDate") ?? "");
      const returnTimeValue = String(formData.get("returnTime") ?? "");
      const departureKey = parseLocalDateKey(departureDateValue);
      const returnKey = parseLocalDateKey(returnDateValue);

      if (
        !departureKey ||
        !returnKey ||
        returnKey <= departureKey ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(returnTimeValue)
      ) {
        setFormError("A data de retorno deve ser posterior à data de partida.");
        return;
      }

      request.returnDate = returnDateValue;
      request.returnTime = returnTimeValue;
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
        <h3 className="flight-quote__title">Conte sobre a sua viagem.</h3>
        <p className="flight-quote__description">
          Informe os dados da viagem e do solicitante para enviar um pedido
          manual de cotação. Isso não confirma uma reserva nem emite passagens.
        </p>
      </div>

      <form className="flight-form" onSubmit={handleSubmit}>
        <div className="flight-form__step-heading">
          <span aria-hidden="true">01</span>
          <h4>Rota e passageiros</h4>
        </div>
        <div className="flight-form__route">
          <div className="flight-form__field">
            <label className="flight-form__label" htmlFor="flight-origin">
              Origem
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
              onChange={clearFormFeedback}
            />
          </div>
          <div className="flight-form__field">
            <label className="flight-form__label" htmlFor="flight-destination">
              Destino
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
              onChange={clearFormFeedback}
            />
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
          </fieldset>
          <div className="flight-form__field flight-form__passengers">
            <label className="flight-form__label" htmlFor="flight-passengers">
              Passageiros
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
              onChange={clearFormFeedback}
            />
          </div>
        </div>

        <div className="flight-form__step-heading">
          <span aria-hidden="true">02</span>
          <h4>Datas e horários</h4>
        </div>
        <div className="flight-form__journey">
          <fieldset className="flight-form__journey-leg">
            <legend className="flight-form__journey-title">Partida</legend>
            <CalendarThree
              id="flight-departure-date"
              label="Data de partida"
              name="departureDate"
              timeName="departureTime"
              value={departureDate}
              minimumDate={today}
              todayDate={today}
              selectedTime={departureTime}
              open={openCalendar === "departure"}
              onOpen={() => setOpenCalendar("departure")}
              onClose={() => setOpenCalendar(null)}
              onDateChange={handleDepartureDateChange}
              onTimeChange={(value) => {
                clearFormFeedback();
                setDepartureTime(value);
              }}
            />
          </fieldset>

          {tripType === "round-trip" ? (
            <fieldset className="flight-form__journey-leg">
              <legend className="flight-form__journey-title">Retorno</legend>
              <CalendarThree
                id="flight-return-date"
                label="Data de retorno"
                name="returnDate"
                timeName="returnTime"
                value={returnDate}
                minimumDate={minimumReturnDate}
                todayDate={today}
                selectedTime={returnTime}
                open={openCalendar === "return"}
                onOpen={() => setOpenCalendar("return")}
                onClose={() => setOpenCalendar(null)}
                onDateChange={handleReturnDateChange}
                onTimeChange={(value) => {
                  clearFormFeedback();
                  setReturnTime(value);
                }}
              />
            </fieldset>
          ) : null}
        </div>

        <p className="flight-form__notice">
          Os horários informados são preferências e não representam
          disponibilidade confirmada.
        </p>

        <div className="flight-form__field">
          <label className="flight-form__label" htmlFor="flight-observations">
            Observações <span>(opcional)</span>
          </label>
          <textarea
            className="flight-form__input flight-form__textarea"
            id="flight-observations"
            name="observations"
            rows={3}
            maxLength={1000}
            placeholder="Inclua informações relevantes para a cotação"
            onChange={clearFormFeedback}
          />
        </div>

        <div className="flight-form__step-heading">
          <span aria-hidden="true">03</span>
          <h4>Identificação do solicitante</h4>
        </div>
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
              onChange={clearFormFeedback}
            />
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
              onChange={clearFormFeedback}
            />
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
              onChange={clearFormFeedback}
            />
          </div>
        </div>

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
            Abrir solicitação no WhatsApp <span aria-hidden="true">↗</span>
          </a>
        ) : null}

        <div className="flight-form__step-heading">
          <span aria-hidden="true">04</span>
          <h4>Envio da solicitação</h4>
        </div>
        <button
          className="button button--accent flight-form__submit"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Abrindo WhatsApp..." : "Enviar solicitação pelo WhatsApp"}
          {!isSubmitting ? <span aria-hidden="true">↗</span> : null}
        </button>
      </form>
    </div>
  );
}
