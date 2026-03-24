"use client";

import { useEffect, useState } from "react";
import { getCompatColor } from "@/lib/result-tokens";
import { getCompatibilityGrade } from "@/lib/constants";

interface CompatibilityGaugeProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

/**
 * CompatibilityGauge — 궁합 점수 원형 게이지 (SVG arc + CSS transition).
 * 앱 CustomPaint 기반 CompatibilityGauge를 웹으로 재현.
 * 12시 방향에서 시작, 시계방향 arc, 1800ms ease-out 애니메이션.
 */
export function CompatibilityGauge({
  score,
  size = 140,
  showLabel = true,
}: CompatibilityGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    // requestAnimationFrame으로 한 프레임 뒤에 score를 세팅하여 CSS transition 트리거
    const raf = requestAnimationFrame(() => {
      setAnimatedScore(score);
    });
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const color = getCompatColor(score);
  const grade = getCompatibilityGrade(score);
  const isDestined = score >= 90;

  const strokeWidth = size * 0.07;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcOffset = circumference * (1 - animatedScore / 100);

  const scoreFontSize = size * 0.28;
  const labelFontSize = size * 0.10;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* SVG 게이지 */}
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        style={
          isDestined
            ? {
                filter:
                  "drop-shadow(0 0 32px #C8B68E4D) drop-shadow(0 0 64px #C8B68E26)",
              }
            : undefined
        }
      >
        {/* 트랙 (배경 원) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-ink/[0.06]"
          strokeWidth={strokeWidth}
        />
        {/* 프로그레스 arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={arcOffset}
          style={{
            transition:
              "stroke-dashoffset 1.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </svg>

      {/* 중앙 텍스트 (SVG 위에 absolute 오버레이) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold text-ink tabular-nums leading-none"
          style={{ fontSize: scoreFontSize }}
        >
          {score}
        </span>
        {showLabel && (
          <span
            className="mt-0.5 font-medium leading-tight"
            style={{ fontSize: labelFontSize, color }}
          >
            {grade.label}
          </span>
        )}
      </div>
    </div>
  );
}
