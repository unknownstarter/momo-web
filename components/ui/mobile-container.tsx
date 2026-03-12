import { type ReactNode } from "react";

interface MobileContainerProps {
  children: ReactNode;
  className?: string;
  /** false면 min-h-dvh 대신 flex 영역에 맞춤(푸터와 함께 한 화면에 들어가게) */
  fillViewport?: boolean;
}

/**
 * 모바일 고정 너비(430px). 모든 화면 공통.
 */
export function MobileContainer({
  children,
  className = "",
  fillViewport = true,
}: MobileContainerProps) {
  const minHeight = fillViewport ? "min-h-dvh" : "min-h-0";
  return (
    <div className={`max-w-mobile ${minHeight} mx-auto w-full ${className}`.trim()}>
      {children}
    </div>
  );
}
