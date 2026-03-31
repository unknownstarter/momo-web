import { ROUTES } from "@/lib/constants";

interface LegalLinksProps {
  className?: string;
  linkClassName?: string;
  separator?: string;
}

/**
 * 이용약관·개인정보처리방침 링크 (단일 소스).
 * 모든 곳에서 이 컴포넌트를 사용하여 링크 일관성을 유지한다.
 */
export function LegalLinks({
  className = "flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-sm",
  linkClassName = "text-ink-muted underline underline-offset-2 hover:text-ink",
  separator = "·",
}: LegalLinksProps) {
  return (
    <div className={className}>
      <a href="https://whatisgoingon.notion.site/momo-3228cdd370538034a1ece378d0de0bd0" target="_blank" rel="noopener noreferrer" className={linkClassName}>
        이용약관
      </a>
      <span className="text-ink-tertiary select-none" aria-hidden>
        {separator}
      </span>
      <a href="https://whatisgoingon.notion.site/momo-3228cdd3705380f3b71ef9160cdfbfd2" target="_blank" rel="noopener noreferrer" className={linkClassName}>
        개인정보처리방침
      </a>
    </div>
  );
}
