"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { decode } from "blurhash";

function BlurAvatar({ hash, size = 56 }: { hash: string; size?: number }) {
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

interface LandingPreviewProps {
  blurHashes: string[];
  profileCount: number;
}

/**
 * 랜딩 결과 미리보기 — 분석 결과 카드 + 블러해시 프로필로 호기심 유발.
 */
export function LandingPreview({ blurHashes, profileCount }: LandingPreviewProps) {
  const reduceMotion = useReducedMotion();
  const hasBlur = blurHashes.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* 관상 결과 미리보기 */}
      <motion.div
        className="rounded-2xl p-5 border border-hanji-border bg-hanji-elevated shadow-medium"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-element-water-pastel border-2 border-hanji flex items-center justify-center shrink-0">
            <Image
              src="/images/characters/mulgyeori/poses/waving.png"
              alt=""
              width={36}
              height={36}
              className="object-contain"
              unoptimized
            />
          </div>
          <div>
            <p className="text-[11px] text-ink-tertiary font-medium tracking-tight">관상 분석 결과</p>
            <p className="text-[20px] font-bold text-ink leading-tight">수달상</p>
            <p className="text-[13px] text-ink-muted mt-0.5">호기심 많은 매력쟁이</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {["따뜻한 공감력", "성장지향적", "포용적인"].map((t) => (
            <span
              key={t}
              className="px-2.5 py-1 rounded-full bg-hanji-secondary text-[12px] text-ink-muted"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-hanji-border">
          <div className="relative">
            <div className="blur-[4px] select-none pointer-events-none" aria-hidden>
              <p className="text-[13px] text-ink leading-relaxed">
                연애에서 깊은 신뢰와 장기적 기반을 중시해요.
                처음엔 신중하지만 한번 마음을 주면 상대를 위해
                진심으로 헌신하는 타입이에요.
              </p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[12px] text-ink-muted bg-hanji-elevated px-3 py-1.5 rounded-full border border-hanji-border shadow-low">
                분석하면 전체를 볼 수 있어요
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 블러해시 매칭 프로필 티저 */}
      {hasBlur && (
        <motion.div
          className="rounded-2xl p-5 border border-hanji-border bg-hanji-elevated shadow-medium"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="flex justify-center">
            <div className="flex items-center -space-x-4">
              {blurHashes.slice(0, 4).map((hash, i) => (
                <div
                  key={i}
                  className="w-[56px] h-[56px] rounded-full overflow-hidden border-[3px] border-hanji-elevated shadow-low"
                  style={{ zIndex: 4 - i }}
                >
                  <BlurAvatar hash={hash} size={56} />
                </div>
              ))}
              {profileCount > blurHashes.length && (
                <div
                  className="w-[56px] h-[56px] rounded-full bg-hanji-secondary border-[3px] border-hanji-elevated shadow-low flex items-center justify-center"
                  style={{ zIndex: 0 }}
                >
                  <span className="text-[12px] font-bold text-ink-muted">
                    +{profileCount - blurHashes.length}
                  </span>
                </div>
              )}
            </div>
          </div>
          <p className="mt-3 text-[13px] text-ink text-center leading-relaxed">
            나와 사주 궁합이 좋은 사람이
            <br />
            이미 <span className="font-bold">{profileCount}명</span> 기다리고 있어요
          </p>
        </motion.div>
      )}
    </div>
  );
}
