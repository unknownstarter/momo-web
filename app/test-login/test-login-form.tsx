"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";

/**
 * 심사용 테스트 계정 로그인 폼.
 * supabase.auth.signInWithPassword → 성공 시 /result 이동.
 */
export function TestLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError("이메일 또는 비밀번호가 올바르지 않아요.");
        setLoading(false);
        return;
      }

      // 로그인 성공 → 결과 페이지로 이동
      router.push(ROUTES.RESULT);
    } catch {
      setError("로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
    }
  };

  const canSubmit =
    email.trim().length > 0 && password.length > 0 && !loading;

  return (
    <MobileContainer className="h-dvh max-h-dvh bg-hanji text-ink flex flex-col">
      <form
        onSubmit={handleSubmit}
        className="flex-1 min-h-0 flex flex-col"
      >
        <main className="flex-1 min-h-0 overflow-y-auto px-5 pt-10 pb-6">
          <section className="w-full">
            <h1 className="text-[22px] font-bold text-ink leading-snug tracking-tight">
              테스트 로그인
            </h1>
            <p className="mt-2 text-[13px] text-ink-muted leading-relaxed">
              심사용 계정 정보를 입력해주세요.
            </p>
          </section>

          <div className="mt-10 space-y-3">
            <div>
              <label htmlFor="test-email" className="sr-only">
                이메일
              </label>
              <input
                id="test-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
                required
                autoFocus
                className="w-full h-12 px-4 rounded-lg border border-hanji-border bg-hanji-elevated text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label htmlFor="test-password" className="sr-only">
                비밀번호
              </label>
              <input
                id="test-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                required
                className="w-full h-12 px-4 rounded-lg border border-hanji-border bg-hanji-elevated text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="text-sm text-red-600 leading-relaxed"
              >
                {error}
              </p>
            )}
          </div>
        </main>

        <CtaBar className="shrink-0">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!canSubmit}
          >
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </CtaBar>
      </form>
    </MobileContainer>
  );
}
