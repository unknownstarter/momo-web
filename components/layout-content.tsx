"use client";

import { usePathname } from "next/navigation";

/**
 * 루트 레이아웃용 — 랜딩(/)에서만 푸터 표시. 온보딩·결제·결과·웨이트리스트 등에서는 푸터 없음.
 */
export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showFooter = pathname === "/";

  return (
    <div className="w-full max-w-mobile h-dvh mx-auto bg-hanji border-x border-[#E0DCD7] box-border overflow-hidden flex flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      {showFooter && (
        <footer className="py-4 px-4 sm:px-5 border-t border-hanji-border shrink-0">
          <p className="text-xs text-ink-tertiary">Dropdown © 2026</p>
          <p className="mt-0.5 text-xs text-ink-tertiary">사업자등록번호 154-28-02110</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-tertiary">
            <a href="/privacy" className="hover:text-ink-muted">
              개인정보처리방침
            </a>
            <a href="/terms" className="hover:text-ink-muted">
              이용약관
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}
