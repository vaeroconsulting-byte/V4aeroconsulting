"use client";

import {
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { addDaysToLocalDate, formatLocalDate, parseLocalDateKey, toLocalDateKey } from "@/lib/dates";
import type { FlightQuoteRequest, TripType } from "@/types/flight-quote";
import CalendarThree from "@/components/ui/calendar-03";

const subscribeToLocalDate = () => () => {};
const getServerLocalDate = () => "";
const getClientLocalDate = () => toLocalDateKey(new Date());

function formatTime(value: string): string {
  return value ? value.replace(":", "h") : "Não informado";
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
  const [review, setReview] = useState<FlightQuoteRequest | null>(null);
  const [formError, setFormError] = useState("");

  const departureDate = departureDateValue;
  const returnDate = returnDateValue;

  const minimumReturnDate = departureDate
    ? addDaysToLocalDate(departureDate, 1)
    : addDaysToLocalDate(today, 1);

  function clearReview() {
    setReview(null);
    setFormError("");
  }

  function handleDepartureDateChange(value: string) {
    const selectedDate = parseLocalDateKey(value);
    const minimumDate = parseLocalDateKey(today);

    if (!selectedDate || !minimumDate || selectedDate < minimumDate) {
      return;
    }

    clearReview();
    setDepartureDate(value);

    if (tripType === "round-trip" && returnDate && returnDate <= value) {
      setReturnDate("");
    }
  }

  function handleReturnDateChange(value: string) {
    if (!parseLocalDateKey(value) || value < minimumReturnDate) {
      return;
    }

    clearReview();
    setReturnDate(value);
  }

  function handleTripTypeChange(nextTripType: TripType) {
    clearReview();
    setTripType(nextTripType);

    if (nextTripType === "one-way") {
      setReturnDate("");
    }

    setOpenCalendar(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearReview();

    const formData = new FormData(event.currentTarget);
    const origin = String(formData.get("origin") ?? "").trim();
    const destination = String(formData.get("destination") ?? "").trim();
    const passengersValue = Number(formData.get("passengers"));
    const departureDateValue = String(formData.get("departureDate") ?? "");
    const departureTimeValue = String(formData.get("departureTime") ?? "");
    const departure = parseLocalDateKey(departureDateValue);
    const minimum = parseLocalDateKey(today);

    if (
      !origin ||
      !destination ||
      !Number.isInteger(passengersValue) ||
      passengersValue < 1 ||
      !departure ||
      !minimum ||
      departure < minimum ||
      !departureTimeValue
    ) {
      setFormError("Confira a origem, o destino, os passageiros e os dados de partida.");
      return;
    }

    const request: FlightQuoteRequest = {
      origin,
      destination,
      passengers: passengersValue,
      tripType,
      departureDate: departureDateValue,
      departureTime: departureTimeValue,
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
        !returnTimeValue
      ) {
        setFormError("A data de retorno deve ser posterior à data de partida.");
        return;
      }

      request.returnDate = returnDateValue;
      request.returnTime = returnTimeValue;
    }

    setReview(request);
  }

  return (
    <div className="flight-quote">
      <div className="flight-quote__intro">
        <p className="eyebrow">Solicitação de voo</p>
        <h3 className="flight-quote__title">Conte sobre a sua viagem.</h3>
        <p className="flight-quote__description">
          Informe um roteiro e horários de preferência para preparar uma
          solicitação demonstrativa.
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
              required
              onChange={clearReview}
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
              required
              onChange={clearReview}
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
              onChange={clearReview}
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
                clearReview();
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
                  clearReview();
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

        {formError ? (
          <p className="flight-form__error" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="flight-form__step-heading">
          <span aria-hidden="true">03</span>
          <h4>Confirmação</h4>
        </div>
        <button className="button button--accent flight-form__submit" type="submit">
          Revisar solicitação <span aria-hidden="true">→</span>
        </button>

        {review ? (
          <section className="quote-review" aria-labelledby="quote-review-title">
            <div>
              <p className="eyebrow">Revisão local</p>
              <h4 className="quote-review__title" id="quote-review-title">
                Confira os dados da viagem.
              </h4>
            </div>
            <dl className="quote-review__details">
              <div>
                <dt>Trecho</dt>
                <dd>
                  {review.origin} → {review.destination}
                </dd>
              </div>
              <div>
                <dt>Passageiros</dt>
                <dd>{review.passengers}</dd>
              </div>
              <div>
                <dt>Tipo de viagem</dt>
                <dd>
                  {review.tripType === "round-trip" ? "Ida e volta" : "Somente ida"}
                </dd>
              </div>
              <div>
                <dt>Partida</dt>
                <dd>
                  {formatLocalDate(review.departureDate)} às{" "}
                  {formatTime(review.departureTime)}
                </dd>
              </div>
              {review.returnDate && review.returnTime ? (
                <div>
                  <dt>Retorno</dt>
                  <dd>
                    {formatLocalDate(review.returnDate)} às{" "}
                    {formatTime(review.returnTime)}
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="quote-review__notice" role="status" aria-live="polite">
              Nenhuma solicitação foi enviada. Os dados ficam somente nesta
              página até a futura integração com um serviço de cotação.
            </p>
          </section>
        ) : null}
      </form>
    </div>
  );
}
