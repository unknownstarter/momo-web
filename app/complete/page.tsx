"use client";

import { useState } from "react";
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
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
          {/* 완료 아이콘 — 브랜드 톤 */}
          <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center shrink-0" aria-hidden>
            <span className="text-3xl text-brand">✓</span>
          </div>
          <h1 className="mt-6 text-[22px] font-bold text-ink tracking-tight">
            신청 완료!
          </h1>
          <p className="mt-3 text-[15px] text-ink-muted leading-relaxed max-w-[280px]">
            앱 출시 시 등록하신 번호로
            <br />
            <strong className="text-ink font-medium">가장 먼저</strong> 알려드릴게요.
          </p>
          <div className="mt-8 w-full max-w-[320px] rounded-2xl border border-hanji-border bg-hanji-elevated p-5 text-left">
            <p className="text-sm font-medium text-ink">이렇게 할게요</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted leading-relaxed">
              <li className="flex gap-2">
                <span className="text-brand shrink-0">1.</span>
                앱이 나오면 문자로 알려드려요.
              </li>
              <li className="flex gap-2">
                <span className="text-brand shrink-0">2.</span>
                앱에서 지금 만든 프로필로 바로 로그인할 수 있어요.
              </li>
              <li className="flex gap-2">
                <span className="text-brand shrink-0">3.</span>
                사주·궁합 맞는 인연 추천을 받을 수 있어요.
              </li>
            </ul>
          </div>
          <p className="mt-6 text-sm text-ink-tertiary">
            그때까지 momo가 기다릴게요 ♥
          </p>
        </div>
        <CtaBar className="flex flex-col gap-3">
          <Link href="/result" className="block w-full">
            <Button type="button" size="lg" className="w-full" variant="primary">
              사주와 관상 결과보기
            </Button>
          </Link>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full"
            onClick={async () => {
              const { createClient } = await import("@/lib/supabase/client");
              await createClient().auth.signOut();
              window.location.href = "/";
            }}
          >
            처음으로
          </Button>
        </CtaBar>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer className="min-h-dvh bg-hanji flex flex-col px-5">
      <div className="flex-1 min-h-0 overflow-auto py-8">
        <h1 className="text-xl font-bold text-ink">
          딱 맞는 인연을 찾을 수 있는 APP이 준비 중이에요.
        </h1>
        <p className="mt-2 text-ink-muted text-sm leading-relaxed">
          완료되면 인증하신 전화번호로 알려드릴게요!
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
