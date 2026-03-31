"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { decode } from "blurhash";
import { ROUTES } from "@/lib/constants";

interface MatchingCounterProps {
  accentColor: string;
  isVerified: boolean;
  userCount: number | null;
  blurHashes: string[];
  onShare: () => void;
  shareUrl: string | null;
}

function BlurHashCard({ hash, size = 64 }: { hash: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !hash) return;
    try {
      const pixels = decode(hash, size, size);
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.createImageData(size, size);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch { /* invalid hash */ }
  }, [hash, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="w-full h-full object-cover"
    />
  );
}

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (target <= 0 || started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return count;
}

export function MatchingCounter({ accentColor, isVerified, userCount, blurHashes, onShare, shareUrl }: MatchingCounterProps) {
  const animatedCount = useCountUp(userCount ?? 0);
  const hasBlur = blurHashes.length > 0;
  const extraCount = (userCount ?? 0) - blurHashes.length;

  return (
    <section className="px-5">
      <div className="rounded-2xl overflow-hidden border border-hanji-border shadow-low bg-hanji-elevated">
        {/* 블러 프로필 그리드 */}
        {hasBlur && (
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-center gap-3">
              {blurHashes.slice(0, 3).map((hash, i) => (
                <div
                  key={i}
                  className="w-[72px] h-[72px] rounded-2xl overflow-hidden border border-hanji-border"
                >
                  <BlurHashCard hash={hash} size={72} />
                </div>
              ))}
              {extraCount > 0 && (
                <div className="w-[72px] h-[72px] rounded-2xl bg-hanji-secondary border border-hanji-border flex items-center justify-center">
                  <span className="text-[14px] font-semibold text-ink-muted">
                    +{extraCount > 99 ? "99" : extraCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 메시지 + CTA */}
        <div className="px-5 pb-5 pt-2 text-center">
          {userCount != null && userCount > 0 && (
            <p className="text-[14px] text-ink leading-relaxed">
              사주 궁합이 높은 이성{" "}
              <span className="font-bold text-[16px]">{animatedCount}명</span>이
              <br />
              매칭을 기다리고 있어요
            </p>
          )}

          {isVerified ? (
            <div className="mt-4">
              <p className="text-[13px] text-ink-muted mb-3">매칭 등록 완료! 앱 출시 시 가장 먼저 매칭해드릴게요</p>
              <button
                type="button"
                onClick={onShare}
                disabled={!shareUrl}
                className="w-full py-3 rounded-xl text-[14px] font-semibold border border-hanji-border text-ink bg-hanji-secondary transition-colors hover:bg-hanji active:bg-hanji"
              >
                친구에게 공유하기
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <Link href={ROUTES.COMPLETE} className="block">
                <button
                  type="button"
                  className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
                  style={{ backgroundColor: "#2D2D2D" }}
                >
                  전화번호 인증하고 확인하기
                </button>
              </Link>
              <p className="text-[11px] text-ink-tertiary mt-2">
                인증하면 앱 출시 즉시 매칭돼요
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
