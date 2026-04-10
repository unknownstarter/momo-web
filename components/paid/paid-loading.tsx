"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

const SAJU_STEPS = ["성격과 기질을 분석하고 있어요","재물운을 해석하고 있어요","직업운을 살펴보고 있어요","연애운을 풀고 있어요","건강운을 확인하고 있어요","대인관계를 살펴보고 있어요","월별 운세를 작성하고 있어요","종합 풀이를 마무리하고 있어요"];
const GWANSANG_STEPS = ["이마의 천정을 살피고 있어요","눈과 눈썹을 분석하고 있어요","코의 재물운을 해석하고 있어요","입과 귀를 살펴보고 있어요","얼굴 윤곽을 읽고 있어요","관상으로 본 성격을 풀고 있어요","관상으로 본 운세를 정리하고 있어요","종합 관상 풀이를 마무리하고 있어요"];

interface PaidLoadingProps { productId: string; }

export function PaidLoading({ productId }: PaidLoadingProps) {
  const steps = productId === "paid_saju" ? SAJU_STEPS : GWANSANG_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => { setStepIndex((prev) => (prev + 1) % steps.length); }, 4000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
      <Image src="/images/characters/loading_spinner.gif" alt="" width={120} height={120} unoptimized />
      <p className="mt-6 text-[15px] font-semibold text-ink text-center">심층 분석 중이에요</p>
      <p className="mt-2 text-[13px] text-ink-muted text-center animate-pulse">{steps[stepIndex]}</p>
      <div className="mt-6 w-48 h-1 bg-hanji-border rounded-full overflow-hidden">
        <div className="h-full bg-brand rounded-full transition-all duration-[4000ms] ease-linear" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
      </div>
    </div>
  );
}
