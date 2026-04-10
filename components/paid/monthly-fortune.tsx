"use client";
import { useState } from "react";

interface MonthData { month: number; title: string; rating?: number; focus?: string; body: string; }
interface MonthlyFortuneProps { year: number; months: MonthData[]; }

export function MonthlyFortune({ year, months }: MonthlyFortuneProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.getFullYear() === year ? now.getMonth() + 1 : 1;
  });
  const current = months.find((m) => m.month === selectedMonth) ?? months[0];

  return (
    <div className="rounded-2xl border border-hanji-border bg-hanji-elevated shadow-low overflow-hidden">
      <div className="p-4 pb-3">
        <h3 className="text-[15px] font-semibold text-ink">{year}년 월별 운세</h3>
      </div>
      <div className="flex overflow-x-auto gap-1 px-4 pb-3 scrollbar-hide">
        {months.map((m) => (
          <button key={m.month} type="button" onClick={() => setSelectedMonth(m.month)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${selectedMonth === m.month ? "bg-brand text-white" : "bg-hanji-secondary text-ink-muted hover:bg-hanji-border"}`}>
            {m.title}
          </button>
        ))}
      </div>
      <div className="px-4 pb-4">
        {current.rating != null && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[13px] text-ink-muted">운세 등급</span>
            <span className="text-[13px] font-semibold text-brand">{"★".repeat(current.rating)}{"☆".repeat(5 - current.rating)}</span>
            {current.focus && <span className="px-1.5 py-0.5 rounded-md bg-brand/15 text-brand text-[11px] font-semibold">{current.focus}</span>}
          </div>
        )}
        <p className="text-[14px] text-ink-muted leading-relaxed whitespace-pre-wrap">{current.body}</p>
      </div>
    </div>
  );
}
