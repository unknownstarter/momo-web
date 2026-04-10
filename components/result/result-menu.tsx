"use client";

import { useState, useCallback } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

type SheetState = "closed" | "settings" | "feedback" | "delete-confirm";

export function ResultMenu() {
  const [sheet, setSheet] = useState<SheetState>("closed");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const closeSheet = useCallback(() => {
    setSheet("closed");
    setFeedbackText("");
    setFeedbackDone(false);
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
    window.location.href = "/";
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackSending(true);
    try {
      const res = await fetch("/api/send-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackText.trim() }),
      });
      if (res.ok) {
        setFeedbackDone(true);
        setFeedbackText("");
      }
    } finally {
      setFeedbackSending(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/delete-account", { method: "POST" });
      if (res.ok) {
        const { createClient } = await import("@/lib/supabase/client");
        await createClient().auth.signOut();
        window.location.href = "/?deleted=1";
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => setSheet("settings")}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-hanji-secondary active:bg-hanji-secondary/80 transition-colors"
        aria-label="메뉴"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {/* Settings Sheet */}
      <BottomSheet open={sheet === "settings"} onClose={closeSheet} showCloseButton>
        <div className="pt-1 pb-3">
          <h3 className="text-[17px] font-semibold text-ink">설정</h3>
        </div>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => { closeSheet(); window.location.href = "/payment-history"; }}
            className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-hanji-secondary transition-colors text-[15px] text-ink"
          >
            결제 내역
          </button>
          <button
            type="button"
            onClick={() => setSheet("feedback")}
            className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-hanji-secondary transition-colors text-[15px] text-ink"
          >
            의견 보내기
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutLoading}
            className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-hanji-secondary transition-colors text-[15px] text-ink disabled:opacity-50"
          >
            {logoutLoading ? "로그아웃 중…" : "로그아웃"}
          </button>
          <div className="my-2 border-t border-hanji-border" />
          <button
            type="button"
            onClick={() => setSheet("delete-confirm")}
            className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-hanji-secondary transition-colors text-[15px] text-ink-tertiary"
          >
            회원 탈퇴
          </button>
        </div>
      </BottomSheet>

      {/* Feedback Sheet */}
      <BottomSheet open={sheet === "feedback"} onClose={closeSheet} showCloseButton>
        {feedbackDone ? (
          <div className="py-8 text-center">
            <p className="text-ink text-[16px] font-semibold">소중한 의견 감사합니다</p>
            <p className="mt-2 text-sm text-ink-tertiary">더 좋은 서비스로 보답하겠습니다</p>
            <Button size="lg" className="w-full mt-6" onClick={closeSheet}>
              닫기
            </Button>
          </div>
        ) : (
          <>
            <div className="pt-1 pb-3">
              <h3 className="text-[17px] font-semibold text-ink">의견 보내기</h3>
              <p className="mt-1 text-sm text-ink-tertiary">
                불편한 점이나 개선 의견을 자유롭게 남겨주세요
              </p>
            </div>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="여기에 의견을 작성해 주세요…"
              rows={5}
              className="w-full rounded-xl border border-hanji-border bg-hanji-secondary px-4 py-3 text-[15px] text-ink placeholder:text-ink-tertiary resize-none focus:outline-none focus:border-brand transition-colors"
            />
            <Button
              size="lg"
              className="w-full mt-4"
              onClick={handleFeedbackSubmit}
              disabled={!feedbackText.trim() || feedbackSending}
            >
              {feedbackSending ? "보내는 중…" : "의견 보내기"}
            </Button>
          </>
        )}
      </BottomSheet>

      {/* Delete Confirmation Sheet */}
      <BottomSheet open={sheet === "delete-confirm"} onClose={closeSheet} showCloseButton>
        <div className="pt-1 pb-2">
          <h3 className="text-[17px] font-semibold text-ink">회원 탈퇴</h3>
        </div>
        <div className="mt-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-4">
          <p className="text-[15px] font-semibold text-[#B91C1C]">
            탈퇴 전 꼭 확인해 주세요
          </p>
          <ul className="mt-3 space-y-2.5 text-sm text-[#991B1B]">
            <li className="flex gap-2">
              <span className="shrink-0 mt-0.5">•</span>
              <span>탈퇴 신청 후 <strong className="font-semibold">7일간 유예 기간</strong>이 주어지며, 이후 계정이 영구 삭제됩니다</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 mt-0.5">•</span>
              <span><strong className="font-semibold">7일 동안 재가입이 불가능</strong>합니다</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 mt-0.5">•</span>
              <span>사주·관상 분석 결과가 <strong className="font-semibold">모두 삭제</strong>되며, 복구할 수 없습니다</span>
            </li>
          </ul>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" className="w-full" onClick={closeSheet}>
            취소
          </Button>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="w-full h-[52px] rounded-[14px] bg-[#FEE2E2] text-[#B91C1C] text-base font-semibold hover:bg-[#FECACA] active:bg-[#FCA5A5] transition-colors disabled:opacity-50"
          >
            {deleting ? "처리 중…" : "탈퇴하기"}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
