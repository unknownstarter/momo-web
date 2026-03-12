"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants";

const LOADING_MESSAGES = [
  { title: "사주팔자를 계산하고 있어요...", sub: "잠시만 기다려 주세요" },
  { title: "AI가 사주를 해석하고 있어요...", sub: "조금만 더 기다려 주세요" },
  { title: "관상을 분석하고 있어요...", sub: "거의 다 됐어요!" },
];

export default function ResultLoadingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const steps = LOADING_MESSAGES.length;
    const duration = 8000;
    const interval = duration / (steps * 10);
    let t = 0;
    const timer = setInterval(() => {
      t += interval;
      const p = Math.min(100, (t / duration) * 100);
      setProgress(p);
      setPhase(Math.min(steps - 1, Math.floor((t / duration) * steps)));
      if (t >= duration) {
        clearInterval(timer);
      }
    }, interval);
    return () => clearInterval(timer);
  }, []);

  const done = progress >= 100;

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.push(ROUTES.RESULT), 1500);
    return () => clearTimeout(t);
  }, [done, router]);

  return (
    /* 레이아웃 px-5를 상쇄해 다크 배경이 양옆 선까지 꽉 차게 */
    <div className="-mx-5 min-h-dvh flex flex-col bg-ink-bg text-hanji-text">
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-5 py-8">
        {/* 로딩 캐릭터 GIF (앱과 동일) */}
        <div className="flex justify-center mb-2">
          <img
            src="/images/characters/loading_spinner.gif"
            alt=""
            width={160}
            height={160}
            className="w-40 h-40 object-contain"
          />
        </div>
        <p className="text-[13px] text-hanji-text/70">잠시만 기다려 주세요</p>
        <p className="mt-1.5 text-xs text-hanji-text/50">
          분석이 끝날 때까지 화면을 유지해 주세요
        </p>

        {/* 단계 인디케이터 (스텝 dots) */}
        <div className="flex gap-2 mt-8 justify-center" aria-hidden>
          {LOADING_MESSAGES.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === phase ? "bg-brand" : i < phase ? "bg-brand/60" : "bg-ink-secondary"
              }`}
            />
          ))}
        </div>

        {/* 메인 단계 텍스트 */}
        <div className="w-full max-w-[280px] mt-8 text-center" role="status" aria-live="polite">
          <p className="text-2xl font-bold text-hanji-text leading-tight">
            {LOADING_MESSAGES[phase]?.title ?? "거의 다 됐어요!"}
          </p>
          <p className="mt-2 text-[15px] text-hanji-text/80">
            {LOADING_MESSAGES[phase]?.sub ?? "기대해 주세요 ✨"}
          </p>
        </div>

        {/* 프로그레스 바 */}
        <div className="w-full max-w-[280px] mt-8">
          <div className="h-1.5 w-full bg-ink-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-hanji-text/60">약 1분 정도 걸릴 수 있어요</p>
        </div>
      </div>
      {done && (
        <p className="text-center text-sm text-hanji-text/80 pb-6 px-5">
          곧 결과 페이지로 이동해요...
        </p>
      )}
    </div>
  );
}
