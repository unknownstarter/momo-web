"use client";

import { usePathname } from "next/navigation";
import { LegalLinks } from "@/components/ui/legal-links";

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
          <p className="text-xs text-ink-tertiary">드롭다운(Dropdown) · 대표 황재하</p>
          <p className="mt-0.5 text-xs text-ink-tertiary">사업자등록번호 154-28-02110</p>
          <p className="mt-0.5 text-xs text-ink-tertiary">통신판매업신고 제2026-서울송파-0882호</p>
          <p className="mt-0.5 text-xs text-ink-tertiary">서울특별시 송파구 중대로 207, 2층 201-J554호</p>
          <p className="mt-0.5 text-xs text-ink-tertiary">hello@dropdown.xyz</p>
          <LegalLinks
            className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs"
            linkClassName="text-ink-tertiary hover:text-ink-muted"
            separator=" "
          />
        </footer>
      )}
    </div>
  );
}
