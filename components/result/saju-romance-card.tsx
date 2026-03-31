"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";

interface SajuRomanceCardProps {
  romanceStyle: string | null;
  romanceKeyPoints: string[] | null;
  accentColor: string;
}

export function SajuRomanceCard({ romanceStyle, romanceKeyPoints, accentColor }: SajuRomanceCardProps) {
  if (!romanceStyle && !romanceKeyPoints?.length) return null;

  return (
    <section className="px-5">
      <div className="rounded-2xl p-5 bg-hanji-elevated border border-hanji-border shadow-low">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}1F` }}
          >
            <span className="text-sm" style={{ color: accentColor }}>&#21340;</span>
          </div>
          <div>
            <p className="text-[16px] font-semibold text-ink">사주 연애운</p>
            <p className="text-[11px] text-ink-tertiary mt-0.5">사주팔자 기반 연애 성향</p>
          </div>
        </div>

        {romanceStyle && (
          <p className="mt-4 text-[14px] text-ink leading-relaxed line-clamp-3">
            {romanceStyle}
          </p>
        )}

        {romanceKeyPoints?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {romanceKeyPoints.slice(0, 3).map((point, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full text-[12px] font-medium border"
                style={{ borderColor: `${accentColor}33`, color: accentColor }}
              >
                {point}
              </span>
            ))}
          </div>
        ) : null}

        <Link
          href={`${ROUTES.RESULT_DETAIL}?tab=saju`}
          className="mt-4 flex items-center justify-between text-[13px] font-medium text-ink-muted"
        >
          <span>사주 자세히 보기</span>
          <svg width={16} height={16} viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
