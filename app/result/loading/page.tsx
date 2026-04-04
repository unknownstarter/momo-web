"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants";

const LOADING_DURATION_MS = 90_000;     // 프로그레스 바 90초에 걸쳐 90%까지 (완료 시 100% 점프)
const RUN_ANALYSIS_TIMEOUT_MS = 120_000; // 분석 API 최대 대기 2분
const MESSAGE_CYCLE_MS = 5_000;         // 문구 5초마다 전환
const LOADING_MESSAGES = [
  { title: "사주팔자를 계산하고 있어요...", sub: "잠시만 기다려 주세요" },
  { title: "AI가 사주를 해석하고 있어요...", sub: "조금만 더 기다려 주세요" },
  { title: "관상을 분석하고 있어요...", sub: "거의 다 됐어요!" },
  { title: "이상형도 함께 찾아볼게요!", sub: "곧 결과를 보여드릴게요" },
];

export default function ResultLoadingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    const interval = 200;
    let t = 0;
    // 프로그레스: 90초에 걸쳐 90%까지 천천히 (완료 시 100% 점프)
    const progressTimer = setInterval(() => {
      t += interval;
      const p = Math.min(90, (t / LOADING_DURATION_MS) * 90);
      setProgress(p);
    }, interval);
    // 문구: 5초마다 순환 반복
    const msgTimer = setInterval(() => {
      setPhase((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, MESSAGE_CYCLE_MS);
    return () => {
      clearInterval(progressTimer);
      clearInterval(msgTimer);
    };
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RUN_ANALYSIS_TIMEOUT_MS);

    (async () => {
      try {
        const res = await fetch("/api/run-analysis", {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));

        if (res.status === 401 || res.status === 404) {
          router.replace(data.error === "no_profile" ? ROUTES.ONBOARDING : ROUTES.HOME);
          return;
        }

        if (res.ok && (data.ok === true || data.alreadyDone === true)) {
          setProgress(100);
          setPhase(LOADING_MESSAGES.length - 1);
          setDone(true);
          // 응답 수신 직후 여기서 리다이렉트 스케줄 (useEffect 의존성 타이밍 이슈 회피)
          setTimeout(() => router.replace(ROUTES.RESULT), 800);
          return;
        }

        setError(data.error || "분석에 실패했어요. 다시 시도해 주세요.");
      } catch (e) {
        clearTimeout(timeoutId);
        if (cancelled) return;
        if ((e as Error).name === "AbortError") {
          setError("분석이 오래 걸려요. 잠시 후 다시 시도해 주세요.");
        } else {
          setError("연결에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.");
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [router]);

  // done 시 리다이렉트는 위 API 성공 분기에서 setTimeout으로 처리. 여기는 폴백용.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.replace(ROUTES.RESULT), 1200);
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
        <p className="mt-2 text-xs text-hanji-text/50">
          사주·관상 분석에 1~2분 걸릴 수 있어요
        </p>

        {/* 단계 인디케이터 (스텝 dots) */}
        <div className="flex gap-2 mt-8 justify-center" aria-hidden>
          {LOADING_MESSAGES.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === phase ? "bg-brand" : "bg-ink-secondary"
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
          <p className="mt-2 text-xs text-hanji-text/60">완료되면 결과 페이지로 이동해요</p>
        </div>

        {error && (
          <div className="mt-6 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-brand underline"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
      {done && (
        <p className="text-center text-sm text-hanji-text/80 pb-6 px-5">
          곧 결과 페이지로 이동해요...
        </p>
      )}
    </div>
  );
}
