"use client";

import { useState } from "react";
import CalendarThree from "@/components/ui/calendar-03";

export default function DemoCalendarThree() {
  const [open, setOpen] = useState(false);

  return (
    <div className="calendar-03-demo">
      <CalendarThree
        id="demo-flight-time"
        label="Data de partida"
        name="demoDepartureDate"
        timeName="demoDepartureTime"
        value="2026-11-06"
        minimumDate="2026-11-06"
        todayDate="2026-11-06"
        selectedTime="09:00"
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        onDateChange={() => undefined}
        onTimeChange={() => undefined}
      />
    </div>
  );
}
