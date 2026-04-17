"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  trackViewAppDownloadSheet,
  trackClickAppDownload,
  trackDismissAppDownloadSheet,
} from "@/lib/analytics";

const APP_STORE_URL =
  "https://apps.apple.com/kr/app/momo-%EB%AA%A8%EB%93%A0-%EC%9D%B8%EC%97%B0%EC%97%94-%EC%9D%B4%EC%9C%A0%EA%B0%80-%EC%9E%88%EB%8B%A4/id6760338547";

const STORAGE_KEY = "momo_app_sheet_dismissed_at";

/** /result 진입 3초 후 앱 다운로드 바텀시트 (하루 1회) */
export function AppDownloadSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < 24 * 60 * 60 * 1000) return;
    }

    const timer = setTimeout(() => {
      setOpen(true);
      trackViewAppDownloadSheet();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    trackDismissAppDownloadSheet();
  }, []);

  const handleDownload = useCallback(() => {
    trackClickAppDownload();
    window.open(APP_STORE_URL, "_blank", "noopener,noreferrer");
    handleClose();
  }, [handleClose]);

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div className="flex flex-col items-center pt-6 pb-4">
        <Image
          src="/images/momo_logo_1024.png"
          alt="모모"
          width={80}
          height={80}
          className="object-contain rounded-2xl"
          unoptimized
        />
        <h3 className="mt-5 text-ink text-[20px] font-bold">
          momo 앱 출시!
        </h3>
        <p className="mt-3 text-ink text-[15px] font-medium leading-relaxed text-center">
          모든 인연엔 이유가 있다.
        </p>
        <p className="mt-1 text-ink-muted text-[14px] leading-relaxed text-center">
          딱 맞는 사람이 기다려요.
          <br />
          지금 앱에서 만나보세요.
        </p>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        className="w-full h-[52px] rounded-xl bg-[#2D2D2D] text-white text-[15px] font-semibold hover:opacity-90 active:opacity-80 transition-opacity inline-flex items-center justify-center gap-2 mt-4"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M12.7 9.4c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3.1-1.7-1.3-.1-2.6.8-3.2.8-.7 0-1.7-.8-2.8-.7-1.4 0-2.7.8-3.5 2.1-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.7.7 2.8.7 1.2 0 1.9-1 2.6-2.1.8-1.2 1.2-2.3 1.2-2.4 0-.1-2.4-.9-2.4-3.4zM10.5 3.3c.6-.7 1-1.7.9-2.7-0.9 0-1.9.6-2.5 1.3-.6.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2z" fill="currentColor"/>
        </svg>
        App Store에서 다운로드
      </button>

      <button
        type="button"
        onClick={handleClose}
        className="w-full py-3.5 mt-2 text-[13px] text-ink-tertiary hover:text-ink-muted transition-colors"
      >
        나중에 할게요
      </button>
    </BottomSheet>
  );
}
