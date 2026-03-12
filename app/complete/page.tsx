"use client";

import { useState } from "react";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";

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

  const validPhone = isValidPhone(phone);
  const canSubmit = agreed && validPhone;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!agreed) return;
    if (!validPhone) {
      setError("올바른 전화번호를 입력해 주세요. (예: 010-0000-0000)");
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col items-center justify-center px-5 text-center">
        <p className="text-2xl font-bold text-ink">🎉 신청 완료!</p>
        <p className="mt-4 text-ink-muted">
          앱 출시 시 알려드릴게요!
        </p>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer className="min-h-dvh bg-hanji flex flex-col px-5 py-8">
      <div className="flex-1">
        <h1 className="text-xl font-bold text-ink">
          딱 맞는 인연을 찾을 수 있는 APP이 준비 중이에요.
        </h1>
        <p className="mt-3 text-ink-muted text-sm leading-relaxed">
          완료되면 인증하신 전화번호로 알려드릴게요!
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="phone" className="block text-ink text-sm mb-1">
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
          <Button
            type="submit"
            size="lg"
            className="w-full mt-6"
            disabled={!canSubmit}
          >
            알림 받기
          </Button>
        </form>
      </div>
    </MobileContainer>
  );
}
