"use client";

import dynamic from "next/dynamic";

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  { ssr: false },
);

interface MatchingCounterProps {
  accentColor: string;
  isVerified: boolean;
  userCount: number | null;
}

export function MatchingCounter({ accentColor, isVerified, userCount }: MatchingCounterProps) {
  return (
    <section className="px-5">
      <div
        className="rounded-2xl p-5 border shadow-low"
        style={{
          backgroundColor: `${accentColor}08`,
          borderColor: `${accentColor}1F`,
        }}
      >
        {userCount != null && userCount > 0 && (
          <div className="text-center mb-4">
            <div className="relative inline-flex items-center justify-center">
              {/* 꽃가루 로띠 — 숫자 뒤에 작게 */}
              <div className="absolute inset-0 -inset-x-4 -inset-y-2 pointer-events-none">
                <DotLottieReact
                  src="/images/confetti.lottie"
                  loop
                  autoplay
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
              <p className="relative text-[32px] font-bold tabular-nums text-ink">
                {userCount.toLocaleString()}
                <span className="text-[15px] font-semibold text-ink ml-1">명</span>
              </p>
            </div>
            <p className="text-[13px] text-ink-muted mt-1">
              궁합 매칭을 기다리고 있어요
            </p>
          </div>
        )}

        <div className="text-center">
          {isVerified ? (
            <>
              <p className="text-[15px] font-semibold text-ink">매칭 등록 완료!</p>
              <p className="mt-1 text-[13px] text-ink-muted leading-relaxed">
                앱 출시 시 가장 먼저 이상형을 매칭해드릴게요
              </p>
            </>
          ) : (
            <>
              <p className="text-[15px] font-semibold text-ink">
                전화번호 인증하면 앱 출시 즉시 매칭!
              </p>
              <p className="mt-1 text-[12px] text-ink-muted">
                지금 등록하면 가장 먼저 매칭 대상이 돼요
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
