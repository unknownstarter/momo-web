"use client";

import { useState, useMemo, useCallback } from "react";
import {
  WheelPicker,
  WheelPickerWrapper,
  type WheelPickerOption,
} from "@ncdai/react-wheel-picker";
import "@ncdai/react-wheel-picker/style.css";

interface BirthDatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
}

const currentYear = new Date().getFullYear();

const yearOptions: WheelPickerOption[] = Array.from(
  { length: currentYear - 1930 + 1 },
  (_, i) => {
    const y = currentYear - i;
    return { label: `${y}년`, value: String(y) };
  }
);

const monthOptions: WheelPickerOption[] = Array.from({ length: 12 }, (_, i) => {
  const m = i + 1;
  return { label: `${m}월`, value: String(m).padStart(2, "0") };
});

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function buildDayOptions(year: number, month: number): WheelPickerOption[] {
  const days = getDaysInMonth(year, month);
  return Array.from({ length: days }, (_, i) => {
    const d = i + 1;
    return { label: `${d}일`, value: String(d).padStart(2, "0") };
  });
}

export function BirthDatePicker({ value, onChange }: BirthDatePickerProps) {
  const parsed = value ? value.split("-") : null;
  const [year, setYear] = useState(parsed?.[0] ?? "2000");
  const [month, setMonth] = useState(parsed?.[1] ?? "01");
  const [day, setDay] = useState(parsed?.[2] ?? "15");

  const dayOptions = useMemo(
    () => buildDayOptions(Number(year), Number(month)),
    [year, month]
  );

  const emit = useCallback(
    (y: string, m: string, d: string) => {
      const maxDay = getDaysInMonth(Number(y), Number(m));
      const safeDay = Number(d) > maxDay ? String(maxDay).padStart(2, "0") : d;
      onChange(`${y}-${m}-${safeDay}`);
    },
    [onChange]
  );

  const handleYearChange = (v: string) => {
    setYear(v);
    const maxDay = getDaysInMonth(Number(v), Number(month));
    const safeDay =
      Number(day) > maxDay ? String(maxDay).padStart(2, "0") : day;
    if (safeDay !== day) setDay(safeDay);
    emit(v, month, safeDay);
  };

  const handleMonthChange = (v: string) => {
    setMonth(v);
    const maxDay = getDaysInMonth(Number(year), Number(v));
    const safeDay =
      Number(day) > maxDay ? String(maxDay).padStart(2, "0") : day;
    if (safeDay !== day) setDay(safeDay);
    emit(year, v, safeDay);
  };

  const handleDayChange = (v: string) => {
    setDay(v);
    emit(year, month, v);
  };

  return (
    <WheelPickerWrapper className="w-full rounded-xl border border-hanji-border bg-hanji-elevated">
      <WheelPicker
        options={yearOptions}
        value={year}
        onValueChange={handleYearChange}
        classNames={{
          optionItem: "text-ink-tertiary text-[15px]",
          highlightWrapper: "bg-hanji-secondary",
          highlightItem: "text-ink font-semibold text-[15px]",
        }}
      />
      <WheelPicker
        options={monthOptions}
        value={month}
        onValueChange={handleMonthChange}
        classNames={{
          optionItem: "text-ink-tertiary text-[15px]",
          highlightWrapper: "bg-hanji-secondary",
          highlightItem: "text-ink font-semibold text-[15px]",
        }}
      />
      <WheelPicker
        options={dayOptions}
        value={day}
        onValueChange={handleDayChange}
        classNames={{
          optionItem: "text-ink-tertiary text-[15px]",
          highlightWrapper: "bg-hanji-secondary",
          highlightItem: "text-ink font-semibold text-[15px]",
        }}
      />
    </WheelPickerWrapper>
  );
}
