/**
 * 루트 레이아웃 컨테이너.
 *
 * 공통 푸터는 각 페이지가 자체 스크롤 영역 안쪽 마지막에 직접 렌더한다
 * (CtaBar 하단 고정 원칙을 해치지 않기 위해). 여기서는 모바일 너비 제한과
 * 테두리만 담당한다.
 */
export function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-mobile h-dvh mx-auto bg-hanji border-x border-[#E0DCD7] box-border overflow-hidden flex flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
