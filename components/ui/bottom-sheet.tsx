"use client";

import { useEffect, useCallback, useState, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** 시트 상단 손잡이 표시 */
  showHandle?: boolean;
  /** 우측 상단 X 닫기 버튼 표시 */
  showCloseButton?: boolean;
}

export function BottomSheet({
  open,
  onClose,
  children,
  showHandle = true,
  showCloseButton = false,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) {
      setMounted(false);
      return;
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);
    const t = requestAnimationFrame(() => setMounted(true));
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end items-center"
      aria-modal="true"
      role="dialog"
      aria-label="로그인"
    >
      {/* 백드롭 — 전체 화면 */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        aria-label="닫기"
      />
      {/* 시트 패널 — 모바일 뷰와 동일한 최대 너비(430px)로 제한 */}
      <div
        className={`relative w-full max-w-mobile bg-hanji rounded-t-2xl shadow-lg max-h-[85dvh] flex flex-col transition-transform duration-300 ease-out ${
          mounted ? "translate-y-0" : "translate-y-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {showHandle && !showCloseButton && (
          <div className="flex justify-center pt-3 pb-1">
            <span className="w-10 h-1 rounded-full bg-ink-tertiary/40" aria-hidden />
          </div>
        )}
        {showCloseButton && (
          <div className="flex justify-end pt-3 px-4 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hanji-secondary transition-colors"
              aria-label="닫기"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-5 pb-8 pb-[max(2rem,env(safe-area-inset-bottom))] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
