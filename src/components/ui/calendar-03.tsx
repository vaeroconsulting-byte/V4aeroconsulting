"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  FALLBACK_CALENDAR_MONTH,
} from "@/components/ui/calendar-03-utils/calendar";
import { parseLocalDateKey, toLocalDateKey } from "@/lib/dates";

const suggestedTimes = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];

export interface CalendarThreeProps {
  id: string;
  label: string;
  name: string;
  timeName: string;
  value: string;
  minimumDate: string;
  todayDate: string;
  selectedTime: string;
  dateError?: string;
  timeError?: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}

function formatSelectedDate(value: string) {
  const date = parseLocalDateKey(value);
  return date ? format(date, "EEEE, d 'de' MMMM", { locale: ptBR }) : "";
}

export default function CalendarThree({
  id,
  label,
  name,
  timeName,
  value,
  minimumDate,
  todayDate,
  selectedTime,
  dateError,
  timeError,
  open,
  onOpen,
  onClose,
  onDateChange,
  onTimeChange,
}: CalendarThreeProps) {
  const selectedDate = parseLocalDateKey(value) ?? undefined;
  const minimum = parseLocalDateKey(minimumDate) ?? undefined;
  const today = parseLocalDateKey(todayDate) ?? minimum;
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const skipFocusOpen = useRef(false);
  const [monthState, setMonthState] = useState(() => ({
    value,
    minimumDate,
    date: selectedDate ?? minimum ?? FALLBACK_CALENDAR_MONTH,
  }));
  const month =
    monthState.value === value && monthState.minimumDate === minimumDate
      ? monthState.date
      : selectedDate ?? minimum ?? monthState.date;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleOutsidePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !pickerRef.current?.contains(event.target)
      ) {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
    };
  }, [open, onClose]);

  function handleMonthChange(date: Date) {
    setMonthState({ value, minimumDate, date });
  }

  function closeAndRestoreFocus() {
    skipFocusOpen.current = document.activeElement !== triggerRef.current;
    onClose();
    triggerRef.current?.focus({ preventScroll: true });
  }

  return (
    <div
      className="calendar-03-picker"
      ref={pickerRef}
      onMouseEnter={onOpen}
      onMouseLeave={(event) => {
        if (!event.currentTarget.contains(document.activeElement)) {
          onClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          closeAndRestoreFocus();
        }
      }}
    >
      <input type="hidden" name={name} value={value} />
      <input type="hidden" name={timeName} value={selectedTime} />
      <button
        ref={triggerRef}
        className="calendar-03-picker__trigger"
        id={`${id}-trigger`}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        data-invalid={Boolean(dateError)}
        aria-describedby={dateError ? `${id}-date-error` : undefined}
        onFocus={() => {
          if (skipFocusOpen.current) {
            skipFocusOpen.current = false;
            return;
          }
          onOpen();
        }}
        onClick={onOpen}
      >
        <svg
          className="calendar-03-picker__trigger-icon"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
          <path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17" />
        </svg>
        <span className="calendar-03-picker__trigger-copy">
          <span className="calendar-03-picker__trigger-label">{label}</span>
          <span className="calendar-03-picker__trigger-date" aria-live="polite">
            {formatSelectedDate(value) || "Selecionar data"}
          </span>
        </span>
        <svg
          className="calendar-03-picker__trigger-chevron"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      <div
        className={`calendar-03-picker__panel${open ? " is-open" : ""}`}
        id={`${id}-panel`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="calendar-03-picker__panel-content">
          <div className="calendar-03-picker__date">
            <Calendar
              selected={selectedDate}
              minimumDate={minimum}
              todayDate={today}
              month={month}
              onMonthChange={handleMonthChange}
              label={`${label}: calendário`}
              onSelect={(date) => {
                if (date) {
                  onDateChange(toLocalDateKey(date));
                  closeAndRestoreFocus();
                }
              }}
            />
          </div>

          <aside className="calendar-03-picker__times" aria-label={`${label}: horário desejado`}>
            <div className="calendar-03-picker__times-heading">
              <p className="calendar-03-picker__label">Horário desejado</p>
              <p className="calendar-03-picker__times-caption">
                Escolha uma preferência
              </p>
            </div>
            <label className="calendar-03-picker__custom-label" htmlFor={id}>
              Ou informe outro horário
            </label>
            <input
              className="flight-form__input flight-form__time-input"
              id={id}
              type="time"
              step={60}
              value={selectedTime}
              required
              aria-invalid={Boolean(timeError)}
              aria-describedby={timeError ? `${id}-time-error` : undefined}
              onChange={(event) => onTimeChange(event.currentTarget.value)}
            />
            <div className="calendar-03-picker__time-list" role="group" aria-label="Sugestões de horário">
              {suggestedTimes.map((time) => (
                <button
                  className="calendar-03-picker__time"
                  type="button"
                  key={time}
                  aria-pressed={selectedTime === time}
                  onClick={() => onTimeChange(time)}
                >
                  {time}
                </button>
              ))}
            </div>
            <p className="calendar-03-picker__preference-note">
              Horários são preferências, não disponibilidade confirmada.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
