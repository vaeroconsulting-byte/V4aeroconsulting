"use client";

import { ptBR } from "date-fns/locale";
import { DayPicker } from "react-day-picker";

export const FALLBACK_CALENDAR_MONTH = new Date(2026, 0, 1);

export interface CalendarProps {
  selected?: Date;
  minimumDate?: Date;
  todayDate?: Date;
  month: Date;
  onMonthChange: (month: Date) => void;
  onSelect: (date: Date | undefined) => void;
  label: string;
}

export function Calendar({
  selected,
  minimumDate,
  todayDate,
  month,
  onMonthChange,
  onSelect,
  label,
}: CalendarProps) {
  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={onSelect}
      locale={ptBR}
      lang="pt-BR"
      aria-label={label}
      showOutsideDays
      navLayout="around"
      month={month ?? selected ?? minimumDate ?? FALLBACK_CALENDAR_MONTH}
      onMonthChange={onMonthChange}
      today={todayDate ?? minimumDate ?? FALLBACK_CALENDAR_MONTH}
      startMonth={minimumDate}
      disabled={minimumDate ? { before: minimumDate } : undefined}
      className="calendar-03"
      classNames={{
        root: "calendar-03__root",
        months: "calendar-03__months",
        month: "calendar-03__month",
        month_caption: "calendar-03__caption",
        caption_label: "calendar-03__caption-label",
        nav: "calendar-03__nav",
        button_previous: "calendar-03__nav-button",
        button_next: "calendar-03__nav-button",
        month_grid: "calendar-03__grid",
        weekdays: "calendar-03__weekdays",
        weekday: "calendar-03__weekday",
        weeks: "calendar-03__weeks",
        week: "calendar-03__week",
        day: "calendar-03__day",
        day_button: "calendar-03__day-button",
        selected: "calendar-03__selected",
        today: "calendar-03__today",
        outside: "calendar-03__outside",
        disabled: "calendar-03__disabled",
        hidden: "calendar-03__hidden",
      }}
    />
  );
}
