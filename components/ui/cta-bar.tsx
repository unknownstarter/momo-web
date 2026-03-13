import { type ReactNode } from "react";

interface CtaBarProps {
  children: ReactNode;
  /** flex 컨테이너 안에서 맨 아래로 보낼 때 mt-auto */
  className?: string;
}

/**
 * 하단 CTA 영역 — 모든 페이지에서 동일한 위치·스타일 유지.
 * flex 컨테이너의 마지막 자식으로 두고, 콘텐츠는 flex-1로 채우면 CTA가 항상 하단에 고정됨.
 */
export function CtaBar({ children, className = "" }: CtaBarProps) {
  return (
    <div className={`shrink-0 pt-8 pb-6 px-4 sm:px-5 border-t border-hanji-border bg-hanji w-full min-w-0 ${className}`.trim()}>
      {children}
    </div>
  );
}
