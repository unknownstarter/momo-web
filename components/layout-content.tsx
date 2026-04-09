"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/ui/site-footer";

/**
 * 루트 레이아웃용 — 랜딩(/)에서만 전역 푸터 표시.
 * /result의 푸터는 페이지 내 스크롤 영역 안쪽에 별도 렌더한다 (CtaBar 하단 고정 규칙 유지).
 * 온보딩·결과 로딩·완료 등 플로우 중간 화면은 푸터 없음.
 */
export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showFooter = pathname === "/";

  return (
    <div className="w-full max-w-mobile h-dvh mx-auto bg-hanji border-x border-[#E0DCD7] box-border overflow-hidden flex flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      {showFooter && <SiteFooter />}
    </div>
  );
}
