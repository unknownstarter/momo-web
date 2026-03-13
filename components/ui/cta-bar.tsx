import { type ReactNode } from "react";

interface CtaBarProps {
  children: ReactNode;
  /** flex 컨테이너 안에서 맨 아래로 보낼 때 mt-auto */
  className?: string;
}

/**
 * 하단 CTA 영역 — 모든 페이지에서 동일한 위치·스타일 유지.
 * flex 컨테이너의 마지막 자식으로 두고, 콘텐츠는 flex-1로 채우면 CTA가 항상 하단에 고정됨.
 * safe-area-inset-bottom: 인앱 웹뷰·노치 환경에서 하단 버튼이 브라우저 UI에 가려지지 않도록.
 */
export function CtaBar({ children, className = "" }: CtaBarProps) {
  return (
    <div
      className={`shrink-0 pt-8 px-4 sm:px-5 border-t border-hanji-border bg-hanji w-full min-w-0 ${className}`.trim()}
      style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      {children}
    </div>
  );
}
