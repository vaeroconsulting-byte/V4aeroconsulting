"use client";

import { useState } from "react";
import {
  addDaysToLocalDate,
  parseLocalDateKey,
} from "@/lib/dates";

interface DateWheelPickerProps {
  id: string;
  label: string;
  name: string;
  value: string;
  minimumDate: string;
  todayDate: string;
  onChange: (value: string) => void;
}

const dateLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  weekday: "long",
});

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
});

const monthYearFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

function getDateLabel(value: string): string {
  const date = parseLocalDateKey(value);
  return date ? dateLabelFormatter.format(date) : value;
}

export function DateWheelPicker({
  id,
  label,
  name,
  value,
  minimumDate,
  todayDate,
  onChange,
}: DateWheelPickerProps) {
  const [range, setRange] = useState({
    minimumDate,
    start: minimumDate,
  });
  const rangeStart =
    range.minimumDate === minimumDate ? range.start : minimumDate;

  const firstDate = parseLocalDateKey(rangeStart || minimumDate);
  const minimum = parseLocalDateKey(minimumDate);
  const dates = firstDate
    ? Array.from({ length: 7 }, (_, index) =>
        addDaysToLocalDate(rangeStart || minimumDate, index),
      )
    : [];
  const monthLabel = firstDate ? monthYearFormatter.format(firstDate) : "";

  function shiftRange(days: number) {
    const currentStart = rangeStart || minimumDate;
    const nextStart = addDaysToLocalDate(currentStart, days);

    if (!nextStart) {
      return;
    }

    const parsedNextStart = parseLocalDateKey(nextStart);
    if (days < 0 && minimum && parsedNextStart && parsedNextStart < minimum) {
      setRange({ minimumDate, start: minimumDate });
      return;
    }

    setRange({ minimumDate, start: nextStart });
  }

  function handleCalendarChange(nextValue: string) {
    const selectedDate = parseLocalDateKey(nextValue);
    const minimumDateValue = parseLocalDateKey(minimumDate);

    if (!selectedDate || !minimumDateValue || selectedDate < minimumDateValue) {
      return;
    }

    onChange(nextValue);
    const centeredStart = addDaysToLocalDate(nextValue, -3);
    setRange({
      minimumDate,
      start: centeredStart < minimumDate ? minimumDate : centeredStart,
    });
  }

  return (
    <fieldset className="date-wheel">
      <legend className="flight-form__label">{label}</legend>
      <label className="date-wheel__calendar-label" htmlFor={id}>
        Ou escolha outra data no calendário
      </label>
      <input
        id={id}
        className="flight-form__input date-wheel__calendar"
        name={name}
        type="date"
        value={value}
        min={minimumDate}
        required
        aria-label={`${label}: calendário`}
        onChange={(event) => handleCalendarChange(event.currentTarget.value)}
      />
      <div className="date-wheel__toolbar">
        <p className="date-wheel__month" aria-live="polite">
          {monthLabel || "Escolha uma data"}
        </p>
        <div className="date-wheel__controls">
          <button
            className="date-wheel__step"
            type="button"
            aria-label="Mostrar sete dias anteriores"
            disabled={!firstDate || !minimum || firstDate <= minimum}
            onClick={() => shiftRange(-7)}
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            className="date-wheel__step"
            type="button"
            aria-label="Mostrar sete dias seguintes"
            disabled={!firstDate}
            onClick={() => shiftRange(7)}
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      <div
        className="date-wheel__track"
        role="group"
        aria-label={`${label}: escolha entre os dias exibidos`}
      >
        {dates.map((dateKey) => {
          const date = parseLocalDateKey(dateKey);

          if (!date) {
            return null;
          }

          const isSelected = value === dateKey;
          const isToday = todayDate === dateKey;

          return (
            <button
              className="date-wheel__day"
              type="button"
              key={dateKey}
              aria-label={getDateLabel(dateKey)}
              aria-pressed={isSelected}
              onClick={() => onChange(dateKey)}
            >
              <span className="date-wheel__weekday">
                {weekdayFormatter.format(date).replace(".", "")}
              </span>
              <span className="date-wheel__number">{date.getDate()}</span>
              <span className="date-wheel__today">
                {isToday ? "Hoje" : "\u00a0"}
              </span>
            </button>
          );
        })}
      </div>
      <p className="date-wheel__selected" aria-live="polite">
        {value ? `Data selecionada: ${getDateLabel(value)}` : "Selecione uma data."}
      </p>
    </fieldset>
  );
}
