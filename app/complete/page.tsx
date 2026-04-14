"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { createClient } from "@/lib/supabase/client";

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidPhone(value: string): boolean {
  const digits = normalizePhone(value);
  return digits.length >= 10 && digits.length <= 11 && /^01[0-9]/.test(digits);
}

export default function CompletePage() {
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // 기존 전화번호가 있으면 로드 + 이미 등록 완료 상태면 바로 완료 화면
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("phone")
          .eq("auth_id", user.id)
          .maybeSingle();
        if (data?.phone) {
          setPhone(data.phone);
          setSubmitted(true);
        }
      } catch { /* 조회 실패 시 빈 폼 표시 */ }
      finally { setInitialLoading(false); }
    })();
  }, []);

  if (initialLoading) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col items-center justify-center">
        <p className="text-sm text-ink-muted">불러오는 중...</p>
      </MobileContainer>
    );
  }

  const validPhone = isValidPhone(phone);
  const canSubmit = agreed && validPhone && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!agreed) return;
    if (!validPhone) {
      setError("올바른 전화번호를 입력해 주세요. (예: 010-0000-0000)");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("로그인이 필요해요. 다시 시도해 주세요.");
        setSaving(false);
        return;
      }

      // 전화번호 저장만. is_phone_verified는 설정하지 않음!
      // 실제 SMS 인증은 앱에서 진행. 웹에서 true로 설정하면
      // 앱의 중복 번호 체크 + 매칭 풀 필터가 깨짐.
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          phone: normalizePhone(phone),
        })
        .eq("auth_id", user.id);

      if (updateError) {
        console.error("[complete] phone save failed:", updateError);
        setError("저장에 실패했어요. 다시 시도해 주세요.");
        setSaving(false);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("[complete] unexpected error:", err);
      setError("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col">
        {/* 헤더 — 뒤로가기 */}
        <header className="shrink-0 flex items-center gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-hanji-border">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hanji-secondary"
            aria-label="뒤로가기"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
          <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center shrink-0" aria-hidden>
            <span className="text-3xl text-brand">✓</span>
          </div>
          <h1 className="mt-6 text-[22px] font-bold text-ink tracking-tight">
            신청 완료!
          </h1>
          <p className="mt-3 text-[15px] text-ink-muted leading-relaxed max-w-[280px]">
            등록하신 번호로 알려드릴게요.
            <br />
            지금 바로 앱에서 찰떡궁합을 찾아보세요!
          </p>

          {/* 앱 다운로드 */}
          <div className="mt-8 w-full max-w-[320px] space-y-3">
            <a
              href="https://apps.apple.com/app/momo-%EB%AA%A8%EB%93%A0-%EC%9D%B8%EC%97%B0%EC%97%94-%EC%9D%B4%EC%9C%A0%EA%B0%80-%EC%9E%88%EB%8B%A4/id6760338547"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-[52px] rounded-xl bg-[#2D2D2D] text-white text-[15px] font-semibold hover:opacity-90 active:opacity-80 transition-opacity inline-flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path d="M12.7 9.4c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3.1-1.7-1.3-.1-2.6.8-3.2.8-.7 0-1.7-.8-2.8-.7-1.4 0-2.7.8-3.5 2.1-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.7.7 2.8.7 1.2 0 1.9-1 2.6-2.1.8-1.2 1.2-2.3 1.2-2.4 0-.1-2.4-.9-2.4-3.4zM10.5 3.3c.6-.7 1-1.7.9-2.7-0.9 0-1.9.6-2.5 1.3-.6.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2z" fill="currentColor"/>
              </svg>
              iOS(아이폰) 앱 다운로드
            </a>
            <p className="text-[13px] text-ink-tertiary">
              안드로이드는 준비 중입니다.
            </p>
          </div>
        </div>
        <CtaBar className="flex flex-col gap-3">
          <Link href="/result" className="block w-full">
            <Button type="button" size="lg" className="w-full" variant="primary">
              사주와 관상 결과보기
            </Button>
          </Link>
        </CtaBar>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer className="min-h-dvh bg-hanji flex flex-col">
      {/* 헤더 — 뒤로가기 */}
      <header className="shrink-0 flex items-center gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-hanji-border">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hanji-secondary"
          aria-label="뒤로가기"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-ink">앱 출시 알림 받기</h1>
      </header>

      <div className="flex-1 min-h-0 overflow-auto px-5 py-8">
        <p className="text-ink-muted text-sm leading-relaxed">
          이상형 매칭 앱이 출시되면 전화번호로 가장 먼저 알려드릴게요!
        </p>
        <form id="complete-form" onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="phone" className="block text-ink text-sm mb-2">
              전화번호
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError(null);
              }}
              placeholder="010-0000-0000"
              className="w-full h-12 px-4 rounded-lg border border-hanji-border bg-hanji-elevated text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              aria-invalid={!!error}
              aria-describedby={error ? "phone-error" : undefined}
            />
            {error && (
              <p id="phone-error" className="mt-1 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
          <label className="flex items-start gap-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-hanji-border text-brand focus:ring-brand"
            />
            <span className="text-ink text-sm">
              문자 수신에 동의합니다 (앱 출시 알림)
            </span>
          </label>
        </form>
      </div>
      <CtaBar>
        <Button
          type="submit"
          form="complete-form"
          size="lg"
          className="w-full"
          disabled={!canSubmit}
        >
          {saving ? "저장 중..." : "알림 받기"}
        </Button>
      </CtaBar>
    </MobileContainer>
  );
}
