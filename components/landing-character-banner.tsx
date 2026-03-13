"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const BANNERS = [
  {
    id: 1,
    text: "궁합 맞는 우리, momo가 연결해 줄게요 💕",
    character: "/images/characters/mulgyeori/poses/waving.png",
  },
  {
    id: 2,
    text: "사주와 관상으로 내 운명을 알아보고",
    character: "/images/characters/namuri/poses/waving.png",
  },
  {
    id: 3,
    text: "나랑 꼭 맞는 사람을 소개해줄게요",
    character: "/images/characters/heuksuni/poses/sitting.png",
  },
];

/** 배너 한 장 — 글래스만, 토스 스타일 자연스러운 등장 */
function BannerCard({
  children,
  delay = 0,
  reduceMotion,
}: {
  children: React.ReactNode;
  delay?: number;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.div
      className="relative rounded-2xl p-4 flex items-center gap-4 border border-white/50 bg-white/40 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.4,
        delay: reduceMotion ? 0 : delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      style={{ WebkitBackdropFilter: "blur(16px)" }}
    >
      <div className="w-full">{children}</div>
    </motion.div>
  );
}

/**
 * 랜딩 배너 3개 — "사주가 이미 알고 있었어요" 영역 바로 아래, 하나씩 자연스럽게 등장 (토스 스타일).
 */
export function LandingCharacterBanner() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="w-full flex flex-col gap-3" aria-label="서비스 안내">
      {BANNERS.map((banner, index) => (
        <BannerCard
          key={banner.id}
          delay={index * 0.2}
          reduceMotion={reduceMotion ?? false}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-hanji flex items-center justify-center bg-hanji-secondary shrink-0">
              <Image
                src={banner.character}
                alt=""
                width={28}
                height={28}
                className="object-contain"
                unoptimized
              />
            </div>
            <p className="text-ink text-sm font-medium">{banner.text}</p>
          </div>
        </BannerCard>
      ))}
    </section>
  );
}
