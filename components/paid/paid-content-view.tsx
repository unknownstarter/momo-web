"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MobileContainer } from "@/components/ui/mobile-container";
import { ROUTES } from "@/lib/constants";
import { PaidLoading } from "@/components/paid/paid-loading";
import { PaidSectionCard } from "@/components/paid/paid-section-card";
import { MonthlyFortune } from "@/components/paid/monthly-fortune";

interface Section {
  id: string; title: string; body?: string; year?: number;
  months?: Array<{ month: number; title: string; rating?: number; focus?: string; body: string; }>;
}
interface PaidContentData { version: number; sections: Section[]; }
interface PaidContentViewProps { productId: string; productName: string; content: PaidContentData | null; }

export function PaidContentView({ productId, productName, content: initialContent }: PaidContentViewProps) {
  const router = useRouter();
  const [content, setContent] = useState<PaidContentData | null>(initialContent);
  const [loading, setLoading] = useState(!initialContent);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const generationTriggeredRef = useRef(false);

  const stopPolling = useCallback(() => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/paid-content/${productId}`);
        if (res.ok) { const data = await res.json(); if (data.content) { setContent(data.content); setLoading(false); stopPolling(); return; } }
      } catch { /* continue */ }
      pollCountRef.current += 1;
      if (pollCountRef.current >= 20) { setError("분석 생성에 시간이 걸리고 있어요. 잠시 후 다시 시도해 주세요."); setLoading(false); stopPolling(); }
    }, 3000);
  }, [productId, stopPolling]);

  useEffect(() => {
    if (initialContent || generationTriggeredRef.current) return;
    generationTriggeredRef.current = true;
    (async () => {
      try { await fetch("/api/paid-content/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) }); } catch { /* may still succeed */ }
      startPolling();
    })();
    const handleVisibility = () => { if (document.hidden) { stopPolling(); } else if (!content && pollCountRef.current < 20) { startPolling(); } };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { stopPolling(); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [initialContent, productId, content, startPolling, stopPolling]);

  const handleRetry = () => { setError(null); setLoading(true); pollCountRef.current = 0; generationTriggeredRef.current = false; };

  return (
    <MobileContainer className="min-h-dvh bg-hanji text-ink flex flex-col">
      <header className="shrink-0 flex items-center gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-hanji-border">
        <button type="button" onClick={() => router.push(ROUTES.RESULT)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hanji-secondary" aria-label="뒤로가기">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 className="text-[17px] font-semibold text-ink">{productName}</h1>
      </header>
      {loading && <PaidLoading productId={productId} />}
      {error && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
          <p className="text-[15px] text-ink-muted text-center">{error}</p>
          <button type="button" onClick={handleRetry} className="mt-4 px-6 py-2.5 rounded-xl bg-brand text-white text-[14px] font-semibold">다시 시도</button>
        </div>
      )}
      {content && !loading && (
        <main className="flex-1 overflow-y-auto">
          <div className="px-5 py-6 space-y-4">
            {content.sections.map((section) => {
              if (section.id === "monthly_fortune" && section.months) {
                return <MonthlyFortune key={section.id} year={section.year ?? new Date().getFullYear()} months={section.months} />;
              }
              return <PaidSectionCard key={section.id} title={section.title} body={section.body ?? ""} />;
            })}
          </div>
          <div className="px-5 pb-8">
            <button type="button" onClick={() => router.push(ROUTES.RESULT)} className="w-full py-3 text-[13px] text-ink-muted text-center hover:text-ink transition-colors">결과 페이지로 돌아가기</button>
          </div>
        </main>
      )}
    </MobileContainer>
  );
}
