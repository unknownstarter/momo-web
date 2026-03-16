"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export default function PendingDeletionPage() {
  const router = useRouter();
  const [remainDays, setRemainDays] = useState<number | null>(null);
  const [completionDate, setCompletionDate] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace(ROUTES.HOME);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_status, deletion_requested_at")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (!profile || profile.account_status !== "pending_deletion") {
        router.replace(ROUTES.RESULT);
        return;
      }

      const requestedAt = new Date(profile.deletion_requested_at);
      const daysSince =
        (Date.now() - requestedAt.getTime()) / (1000 * 60 * 60 * 24);
      setRemainDays(Math.max(1, Math.ceil(7 - daysSince)));

      const completion = new Date(requestedAt);
      completion.setDate(completion.getDate() + 7);
      setCompletionDate(
        `${completion.getMonth() + 1}월 ${completion.getDate()}일`
      );
    })();
  }, [router]);

  const handleCancel = async () => {
    setCancelling(true);
    const res = await fetch("/api/cancel-deletion", { method: "POST" });
    if (res.ok) {
      router.replace(ROUTES.RESULT);
    }
    setCancelling(false);
  };

  const handleContinue = async () => {
    setLoggingOut(true);
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
    window.location.href = "/";
  };

  if (remainDays === null) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex items-center justify-center">
        <p className="text-ink-muted text-sm">확인 중…</p>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer className="min-h-dvh bg-hanji flex flex-col px-5">
      <div className="flex-1 flex flex-col justify-center">
        {/* 아이콘 */}
        <div className="w-16 h-16 mx-auto rounded-full bg-[#FEF2F2] flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 9v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z"
              stroke="#DC2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* 타이틀 */}
        <h1 className="mt-6 text-center text-[22px] font-bold text-ink leading-snug">
          탈퇴 신청 중이에요
        </h1>
        <p className="mt-3 text-center text-[15px] text-ink-muted leading-relaxed">
          <strong className="text-ink font-semibold">{completionDate}</strong>
          까지 취소할 수 있어요.
        </p>

        {/* 안내 박스 */}
        <div className="mt-8 rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-4">
          <ul className="space-y-2.5 text-sm text-[#991B1B]">
            <li className="flex gap-2">
              <span className="shrink-0 mt-0.5">•</span>
              <span>
                남은 유예 기간:{" "}
                <strong className="font-semibold">{remainDays}일</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 mt-0.5">•</span>
              <span>유예 기간이 지나면 계정이 영구 삭제됩니다</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 mt-0.5">•</span>
              <span>지금 취소하면 기존 데이터가 그대로 유지됩니다</span>
            </li>
          </ul>
        </div>
      </div>

      {/* CTA 영역 */}
      <div className="shrink-0 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 space-y-3">
        <Button
          size="lg"
          className="w-full"
          onClick={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? "처리 중…" : "탈퇴 취소하고 돌아가기"}
        </Button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={loggingOut}
          className="w-full py-3 text-sm text-ink-tertiary hover:text-ink-muted transition-colors disabled:opacity-50"
        >
          {loggingOut ? "로그아웃 중…" : "그대로 탈퇴 진행하기"}
        </button>
      </div>
    </MobileContainer>
  );
}
