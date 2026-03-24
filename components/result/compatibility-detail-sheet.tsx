"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { CompatibilityGauge } from "@/components/result/compatibility-gauge";
import { SajuCard } from "@/components/result/saju-card";
import {
  ELEMENT_COLORS,
  elementKey,
  getCharacterTypeFromElement,
  getCompatColor,
  MYSTIC_GLOW,
} from "@/lib/result-tokens";
import { getCompatibilityGrade } from "@/lib/constants";
import { trackShareCompatibilityResult } from "@/lib/analytics";
import type { CompatibilityResult } from "@/lib/compatibility";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CompatibilityDetailSheetProps {
  open: boolean;
  onClose: () => void;
  compatibility: CompatibilityResult;
  myName: string;
  myCharacterType: string | null;
  myDominantElement: string | null;
  shareUrl?: string | null;
  cachedAiStory: string | null;
  onStoryLoaded: (partnerId: string, story: string) => void;
}

// ---------------------------------------------------------------------------
// 내부: AiStorySection
// ---------------------------------------------------------------------------

function AiStorySection({
  partnerId,
  initialStory,
  onStoryLoaded,
  label = "인연 스토리",
}: {
  partnerId: string;
  initialStory: string | null;
  onStoryLoaded: (partnerId: string, story: string) => void;
  label?: string;
}) {
  const [story, setStory] = useState<string | null>(initialStory);
  const [polling, setPolling] = useState(!initialStory);
  const [failed, setFailed] = useState(false);
  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // initialStory가 바뀌면 즉시 반영 (부모에서 캐시 업데이트)
  useEffect(() => {
    if (initialStory) {
      setStory(initialStory);
      setPolling(false);
      setFailed(false);
    }
  }, [initialStory]);

  const pollOnce = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/compatibility-story?partnerId=${encodeURIComponent(partnerId)}`,
      );
      if (!res.ok) return false;
      const json = await res.json();
      if (json.ok && json.aiStory) {
        setStory(json.aiStory);
        setPolling(false);
        onStoryLoaded(partnerId, json.aiStory);
        return true;
      }
    } catch {
      // 네트워크 에러 무시
    }
    return false;
  }, [partnerId, onStoryLoaded]);

  // 폴링 루프
  useEffect(() => {
    if (!polling) return;

    attemptRef.current = 0;

    const tick = async () => {
      attemptRef.current += 1;
      const found = await pollOnce();
      if (found) return;
      if (attemptRef.current >= 3) {
        setPolling(false);
        setFailed(true);
        return;
      }
      timerRef.current = setTimeout(tick, 5000);
    };

    timerRef.current = setTimeout(tick, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [polling, pollOnce]);

  const handleRetry = () => {
    setFailed(false);
    setPolling(true);
  };

  // 로딩 중
  if (polling && !story) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Image
          src="/images/characters/loading_spinner.gif"
          alt=""
          width={80}
          height={80}
          className="w-20 h-20 object-contain"
          unoptimized
        />
        <p className="text-sm text-ink-muted">
          {label}를 만들고 있어요...
        </p>
      </div>
    );
  }

  // 실패
  if (failed && !story) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-ink-muted">
          잠시 후 다시 확인해보세요
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="text-sm font-medium px-4 py-2 rounded-full border border-hanji-border hover:bg-hanji-secondary transition-colors"
        >
          다시 확인하기
        </button>
      </div>
    );
  }

  // 스토리 도착
  if (story) {
    return (
      <div
        className="rounded-card p-4"
        style={{
          border: `1px solid ${MYSTIC_GLOW}4D`,
          backgroundColor: `${MYSTIC_GLOW}0F`,
        }}
      >
        <p
          className="text-xs font-semibold mb-2"
          style={{ color: MYSTIC_GLOW }}
        >
          {label}
        </p>
        <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
          {story}
        </p>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// 메인: CompatibilityDetailSheet
// ---------------------------------------------------------------------------

export function CompatibilityDetailSheet({
  open,
  onClose,
  compatibility: c,
  myName,
  myCharacterType,
  myDominantElement,
  shareUrl,
  cachedAiStory,
  onStoryLoaded,
}: CompatibilityDetailSheetProps) {
  const grade = getCompatibilityGrade(c.score);
  const gradeColor = getCompatColor(c.score);
  const isDestined = c.score >= 90;

  // 오행 키 → 색상
  const myElKey = elementKey(myDominantElement);
  const partnerElKey = elementKey(c.partnerDominantElement);
  const myColors = ELEMENT_COLORS[myElKey];
  const partnerColors = ELEMENT_COLORS[partnerElKey];

  // 캐릭터 타입
  const myChar = myCharacterType || getCharacterTypeFromElement(myDominantElement);
  const partnerChar =
    c.partnerCharacterType || getCharacterTypeFromElement(c.partnerDominantElement);

  // AI 스토리 초기값
  const initialStory = cachedAiStory ?? c.aiStory;

  // 공유 핸들러
  const handleShare = async () => {
    trackShareCompatibilityResult();
    const text = `${myName}님과 ${c.partnerName ?? "친구"}님의 사주 궁합: ${c.score}점 - ${grade.label}!`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text, url: shareUrl ?? window.location.href });
      } catch {
        // 사용자가 공유 취소
      }
    } else {
      await navigator.clipboard.writeText(
        `${text}\n${shareUrl ?? window.location.href}`,
      );
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} showCloseButton>
      <div className="flex flex-col items-center gap-5 pt-2">
        {/* 1. 캐릭터 쌍 */}
        <div className="flex items-center gap-3">
          {/* 내 캐릭터 */}
          <div
            className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              backgroundColor: myColors.pastel,
              border: `2px solid ${myColors.main}4D`,
            }}
          >
            <Image
              src={`/images/characters/${myChar}/default.png`}
              alt={myName}
              width={42}
              height={42}
              className="object-contain"
              unoptimized
            />
          </div>

          {/* 하트 */}
          <span
            className="text-lg"
            style={{ color: gradeColor }}
            aria-hidden
          >
            &#9829;
          </span>

          {/* 상대 캐릭터 */}
          <div
            className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              backgroundColor: partnerColors.pastel,
              border: `2px solid ${partnerColors.main}4D`,
            }}
          >
            <Image
              src={`/images/characters/${partnerChar}/default.png`}
              alt={c.partnerName ?? "상대"}
              width={42}
              height={42}
              className="object-contain"
              unoptimized
            />
          </div>
        </div>

        {/* 2. 이름 */}
        <p className="text-sm text-ink-muted">
          {myName} &amp; {c.partnerName ?? "친구"}
        </p>

        {/* 3. 관계 유형 배지 */}
        <span
          className="inline-block text-xs font-medium px-3 py-1 rounded-full"
          style={{
            color: gradeColor,
            backgroundColor: `${gradeColor}1A`,
          }}
        >
          {c.relationType === "romantic" ? "연인 궁합" : "친구 궁합"}
        </span>

        {/* 4. 게이지 */}
        <CompatibilityGauge score={c.score} size={140} />

        {/* 5. 등급 설명 */}
        <p className="text-sm text-ink-muted text-center">
          {grade.description}
        </p>

        {/* 6. 서브스코어 2열 */}
        {(c.fiveElementScore != null || c.dayPillarScore != null) && (
          <div className="flex gap-3 w-full">
            {c.fiveElementScore != null && (
              <SajuCard variant="flat" className="flex-1 text-center">
                <p className="text-xs text-ink-muted mb-1">오행 궁합</p>
                <p className="text-lg font-bold text-ink">
                  {c.fiveElementScore}
                  <span className="text-xs font-normal text-ink-muted">점</span>
                </p>
              </SajuCard>
            )}
            {c.dayPillarScore != null && (
              <SajuCard variant="flat" className="flex-1 text-center">
                <p className="text-xs text-ink-muted mb-1">일주 궁합</p>
                <p className="text-lg font-bold text-ink">
                  {c.dayPillarScore}
                  <span className="text-xs font-normal text-ink-muted">점</span>
                </p>
              </SajuCard>
            )}
          </div>
        )}

        {/* 7. 강점 */}
        {c.strengths.length > 0 && (
          <div className="w-full">
            <p className="text-sm font-semibold text-ink mb-2">
              이런 점이 잘 맞아요
            </p>
            <ul className="space-y-1.5">
              {c.strengths.slice(0, 3).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-secondary">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-ink-tertiary shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 8. 도전 */}
        {c.challenges.length > 0 && (
          <div className="w-full">
            <p className="text-sm font-semibold text-ink mb-2">
              함께 노력하면 좋은 점
            </p>
            <ul className="space-y-1.5">
              {c.challenges.slice(0, 3).map((ch, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-secondary">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-ink-tertiary shrink-0" />
                  {ch}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 9. AI 스토리 (이성: 인연 스토리 / 동성: 케미 분석) */}
        <div className="w-full">
          <AiStorySection
            partnerId={c.partnerId}
            initialStory={initialStory}
            onStoryLoaded={onStoryLoaded}
            label={c.relationType === "romantic" ? "인연 스토리" : "케미 분석"}
          />
        </div>

        {/* 10. 공유 버튼 */}
        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3.5 rounded-button text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
          style={
            isDestined
              ? {
                  background: `linear-gradient(135deg, ${MYSTIC_GLOW}, #D4C9A8)`,
                  boxShadow: `0 0 24px ${MYSTIC_GLOW}4D`,
                }
              : { backgroundColor: gradeColor }
          }
        >
          이 궁합 결과 공유하기
        </button>
      </div>
    </BottomSheet>
  );
}
