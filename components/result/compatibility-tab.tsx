"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { CompatibilityGauge } from "@/components/result/compatibility-gauge";
import { CompatibilityDetailSheet } from "@/components/result/compatibility-detail-sheet";
import { SajuCard } from "@/components/result/saju-card";
import {
  ELEMENT_COLORS,
  elementKey,
  getCharacterTypeFromElement,
  getCompatColor,
} from "@/lib/result-tokens";
import { getCompatibilityGrade } from "@/lib/constants";
import {
  trackViewCompatibilityTab,
  trackViewCompatibilityDetail,
} from "@/lib/analytics";
import type { CompatibilityResult } from "@/lib/compatibility";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CompatibilityTabProps {
  referralPartnerId: string | null;
  myName: string;
  myCharacterType: string | null;
  myDominantElement: string | null;
  shareUrl: string | null;
}

// ---------------------------------------------------------------------------
// 내부: CompatibilityListCard
// ---------------------------------------------------------------------------

function CompatibilityListCard({
  item,
  onSelect,
}: {
  item: CompatibilityResult;
  onSelect: () => void;
}) {
  const grade = getCompatibilityGrade(item.score);
  const gradeColor = getCompatColor(item.score);
  const partnerElKey = elementKey(item.partnerDominantElement);
  const partnerColors = ELEMENT_COLORS[partnerElKey];
  const partnerChar =
    item.partnerCharacterType ||
    getCharacterTypeFromElement(item.partnerDominantElement);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left active:scale-[0.98] transition-transform"
    >
      <SajuCard variant="elevated">
        <div className="flex items-center gap-3">
          {/* 왼쪽: 게이지 */}
          <div className="shrink-0">
            <CompatibilityGauge score={item.score} size={56} showLabel={false} />
          </div>

          {/* 가운데: 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* 캐릭터 미니 원 */}
              <div
                className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: partnerColors.pastel,
                  border: `1.5px solid ${partnerColors.main}4D`,
                }}
              >
                <Image
                  src={`/images/characters/${partnerChar}/default.png`}
                  alt=""
                  width={16}
                  height={16}
                  className="object-contain"
                  unoptimized
                />
              </div>

              {/* 이름 */}
              <span className="text-sm font-semibold text-ink truncate">
                {item.partnerName ?? "친구"}
              </span>

              {/* 관계 pill */}
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                style={{
                  color: gradeColor,
                  backgroundColor: `${gradeColor}1A`,
                }}
              >
                {item.relationType === "romantic" ? "연인" : "친구"}
              </span>
            </div>

            {/* 점수 + 등급 */}
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className="text-base font-bold tabular-nums"
                style={{ color: gradeColor }}
              >
                {item.score}점
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: gradeColor }}
              >
                {grade.label}
              </span>
            </div>

            {/* 한줄 분석 */}
            {item.overallAnalysis && (
              <p className="text-xs text-ink-muted line-clamp-1">
                {item.overallAnalysis}
              </p>
            )}
          </div>

          {/* 오른쪽: 화살표 */}
          <div className="shrink-0 text-ink-tertiary">
            <svg
              width={20}
              height={20}
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
            >
              <path
                d="M7.5 5L12.5 10L7.5 15"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </SajuCard>
    </button>
  );
}

// ---------------------------------------------------------------------------
// 메인: CompatibilityTab
// ---------------------------------------------------------------------------

export function CompatibilityTab({
  referralPartnerId,
  myName,
  myCharacterType,
  myDominantElement,
  shareUrl,
}: CompatibilityTabProps) {
  const [list, setList] = useState<CompatibilityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [selected, setSelected] = useState<CompatibilityResult | null>(null);
  const [storyCacheMap, setStoryCacheMap] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 레퍼럴 처리 중복 방지
  const referralHandled = useRef(false);

  // AI 스토리 캐시 콜백
  const onStoryLoaded = useCallback(
    (partnerId: string, story: string) => {
      setStoryCacheMap((prev) => ({ ...prev, [partnerId]: story }));
    },
    [],
  );

  // 리스트 로드
  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/compatibility-list");
      if (!res.ok) return;
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setList(json.data);
      }
    } catch {
      // 네트워크 에러 무시
    }
  }, []);

  // -----------------------------------------------------------------------
  // Effects
  // -----------------------------------------------------------------------

  // 1. 탭 진입 트래킹
  useEffect(() => {
    trackViewCompatibilityTab();
  }, []);

  // 2. 마운트 시 리스트 로드
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      await loadList();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadList]);

  // 3. referralPartnerId 처리
  useEffect(() => {
    if (!referralPartnerId || loading || referralHandled.current) return;
    referralHandled.current = true;

    // 이미 리스트에 있으면 바로 열기
    const existing = list.find((c) => c.partnerId === referralPartnerId);
    if (existing) {
      trackViewCompatibilityDetail(existing.score);
      setSelected(existing);
      return;
    }

    // 없으면 계산 요청
    (async () => {
      setCalculating(true);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/calculate-compatibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partnerProfileId: referralPartnerId }),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok && json.data) {
          trackViewCompatibilityDetail(json.data.score);
          setSelected(json.data);
          await loadList();
        } else {
          // API 에러 유형별 유저 메시지
          const err = json?.error ?? "";
          if (err.includes("yourself")) {
            setErrorMessage("본인과는 궁합을 볼 수 없어요");
          } else if (err === "compatibility_calculation_failed") {
            setErrorMessage("상대방이 아직 사주 분석을 완료하지 않았어요");
          } else {
            setErrorMessage("궁합 계산에 실패했어요. 다시 시도해주세요");
          }
        }
      } catch {
        setErrorMessage("네트워크 오류가 발생했어요. 다시 시도해주세요");
      } finally {
        setCalculating(false);
      }
    })();
  }, [referralPartnerId, loading, list, loadList]);

  // -----------------------------------------------------------------------
  // 공유 핸들러
  // -----------------------------------------------------------------------

  const handleShare = async () => {
    const text = "내 사주 궁합을 확인해보세요!";
    const url = shareUrl ?? window.location.href;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text, url });
      } catch {
        // 사용자가 공유 취소
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
      } catch {
        // clipboard 실패
      }
    }
  };

  // -----------------------------------------------------------------------
  // 아이템 선택 핸들러
  // -----------------------------------------------------------------------

  const handleSelect = (item: CompatibilityResult) => {
    trackViewCompatibilityDetail(item.score);
    setSelected(item);
  };

  // -----------------------------------------------------------------------
  // 캐릭터 색상 (빈 상태용)
  // -----------------------------------------------------------------------

  const myElKey = elementKey(myDominantElement);
  const myColors = ELEMENT_COLORS[myElKey];
  const myChar = myCharacterType || getCharacterTypeFromElement(myDominantElement);

  // -----------------------------------------------------------------------
  // 로딩 / 계산 중
  // -----------------------------------------------------------------------

  if (loading || calculating) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Image
          src="/images/characters/loading_spinner.gif"
          alt=""
          width={80}
          height={80}
          className="w-20 h-20 object-contain"
          unoptimized
        />
        <p className="text-sm text-ink-muted">
          {calculating ? "궁합을 계산하고 있어요..." : "불러오는 중..."}
        </p>
      </div>
    );
  }

  // 에러 메시지 표시
  if (errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-sm text-ink-muted">{errorMessage}</p>
        <div className="flex gap-2">
          {referralPartnerId && (
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                referralHandled.current = false; // 재시도 허용
              }}
              className="text-sm font-medium px-4 py-2 rounded-full bg-ink text-white hover:opacity-90 transition-opacity"
            >
              다시 시도
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              loadList();
            }}
            className="text-sm font-medium px-4 py-2 rounded-full border border-hanji-border hover:bg-hanji-secondary transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // 빈 상태
  // -----------------------------------------------------------------------

  if (list.length === 0) {
    const soedongiColors = ELEMENT_COLORS.metal;

    return (
      <div className="flex flex-col items-center gap-4 py-16 px-5">
        {/* 캐릭터 버블 2개 겹침 */}
        <div className="flex items-center -space-x-2">
          {/* 내 캐릭터 */}
          <div
            className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center z-10"
            style={{
              backgroundColor: myColors.pastel,
              border: `2px solid ${myColors.main}4D`,
            }}
          >
            <Image
              src={`/images/characters/${myChar}/default.png`}
              alt={myName}
              width={28}
              height={28}
              className="object-contain"
              unoptimized
            />
          </div>

          {/* 쇠동이 */}
          <div
            className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              backgroundColor: soedongiColors.pastel,
              border: `2px solid ${soedongiColors.main}4D`,
            }}
          >
            <Image
              src="/images/characters/soedongi/default.png"
              alt="친구"
              width={28}
              height={28}
              className="object-contain"
              unoptimized
            />
          </div>
        </div>

        <div className="text-center">
          <p className="font-semibold text-ink">
            아직 궁합 본 친구가 없어요
          </p>
          <p className="text-sm text-ink-muted mt-1">
            친구에게 링크를 공유하면 궁합을 볼 수 있어요!
          </p>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="mt-2 w-full max-w-[280px] py-3.5 rounded-button text-sm font-semibold text-white bg-ink transition-opacity hover:opacity-90 active:opacity-80"
        >
          궁합 요청 링크 공유하기
        </button>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // 리스트 UI
  // -----------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-3">
      {/* 헤더 */}
      <p className="text-xs text-ink-muted px-1">
        궁합 본 친구 ({list.length}명)
      </p>

      {/* 리스트 */}
      <div className="flex flex-col gap-3">
        {list.map((item) => (
          <CompatibilityListCard
            key={item.id}
            item={item}
            onSelect={() => handleSelect(item)}
          />
        ))}
      </div>

      {/* 다른 친구와 궁합 보기 버튼 */}
      <button
        type="button"
        onClick={handleShare}
        className="mt-1 w-full py-3 rounded-button text-sm font-medium text-ink-muted border border-hanji-border transition-colors hover:bg-hanji-secondary active:bg-hanji-secondary"
      >
        + 다른 친구와도 궁합 보기
      </button>

      {/* 상세 바텀시트 */}
      {selected && (
        <CompatibilityDetailSheet
          open={!!selected}
          onClose={() => setSelected(null)}
          compatibility={selected}
          myName={myName}
          myCharacterType={myCharacterType}
          myDominantElement={myDominantElement}
          shareUrl={shareUrl}
          cachedAiStory={storyCacheMap[selected.partnerId] ?? null}
          onStoryLoaded={onStoryLoaded}
        />
      )}
    </div>
  );
}
