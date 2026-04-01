"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { trackClickGwansangDetail } from "@/lib/analytics";

interface GwansangRomanceCardProps {
  animalTypeKorean: string | null;
  animalModifier: string | null;
  romanceSummary: string | null;
  charmKeywords: string[] | null;
}

export function GwansangRomanceCard({
  animalTypeKorean,
  animalModifier,
  romanceSummary,
  charmKeywords,
}: GwansangRomanceCardProps) {
  if (!romanceSummary && !charmKeywords?.length) return null;

  const animalLabel = animalTypeKorean
    ? [animalModifier, animalTypeKorean].filter(Boolean).join(" ") + "상"
    : null;

  return (
    <section className="px-5">
      <div className="rounded-2xl p-5 bg-hanji-elevated border border-hanji-border shadow-low">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-brand/15">
            <span className="text-sm text-brand">&#30456;</span>
          </div>
          <div>
            <p className="text-[16px] font-semibold text-ink">관상 연애운</p>
            {animalLabel && (
              <p className="text-[11px] text-ink-tertiary mt-0.5">{animalLabel}의 연애</p>
            )}
          </div>
        </div>

        {romanceSummary && (
          <p className="mt-4 text-[14px] text-ink leading-relaxed line-clamp-3">
            {romanceSummary}
          </p>
        )}

        {charmKeywords?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {charmKeywords.slice(0, 3).map((keyword, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full text-[12px] font-medium border border-brand/30 text-brand"
              >
                {keyword}
              </span>
            ))}
          </div>
        ) : null}

        <Link
          href={`${ROUTES.RESULT_DETAIL}?tab=gwansang`}
          onClick={trackClickGwansangDetail}
          className="mt-4 flex items-center justify-between text-[13px] font-medium text-ink-muted"
        >
          <span>관상 자세히 보기</span>
          <svg width={16} height={16} viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
