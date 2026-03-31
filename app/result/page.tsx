"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { ROUTES } from "@/lib/constants";
import {
  elementKey,
  ELEMENT_COLORS,
} from "@/lib/result-tokens";
import { classifyRomanceType } from "@/lib/romance-types";
import { MatchingHero } from "@/components/result/matching-hero";
import { SajuRomanceCard } from "@/components/result/saju-romance-card";
import { GwansangRomanceCard } from "@/components/result/gwansang-romance-card";
import { MatchingCounter } from "@/components/result/matching-counter";
import { trackClickShareInResult } from "@/lib/analytics";

interface ProfileRow {
  name: string | null;
  character_type: string | null;
  dominant_element: string | null;
  profile_images: string[] | null;
  is_phone_verified: boolean | null;
}

interface SajuProfileRow {
  dominant_element: string;
  personality_traits: string[] | null;
  romance_style: string | null;
  romance_key_points: string[] | null;
  ideal_match: { description?: string; traits?: string[] } | null;
}

interface GwansangProfileRow {
  animal_type_korean: string;
  animal_modifier: string;
  romance_summary: string;
  charm_keywords: string[] | null;
  ideal_match_animal_korean: string | null;
}

function guessElementFromTraits(traits: string[]): string | null {
  const text = traits.join(" ");
  if (/물|차분|깊|공감|유연|감성/.test(text)) return "water";
  if (/나무|성장|활발|따뜻|배려/.test(text)) return "wood";
  if (/불|열정|솔직|에너지|적극/.test(text)) return "fire";
  if (/흙|안정|믿|든든|포용/.test(text)) return "earth";
  if (/쇠|단단|독립|냉철|명확/.test(text)) return "metal";
  return null;
}

export default function MatchingMainPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [sajuProfile, setSajuProfile] = useState<SajuProfileRow | null>(null);
  const [gwansangProfile, setGwansangProfile] = useState<GwansangProfileRow | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [compatCount, setCompatCount] = useState(0);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [blurHashes, setBlurHashes] = useState<string[]>([]);

  // 데이터 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("name, character_type, dominant_element, profile_images, is_phone_verified, saju_profile_id, gwansang_profile_id")
          .eq("auth_id", user.id)
          .maybeSingle();
        if (!profileRow || cancelled) { setDataLoading(false); return; }
        setProfile({
          name: profileRow.name,
          character_type: profileRow.character_type,
          dominant_element: profileRow.dominant_element ?? null,
          profile_images: profileRow.profile_images,
          is_phone_verified: profileRow.is_phone_verified ?? false,
        });
        if (profileRow.saju_profile_id) {
          const { data: saju } = await supabase
            .from("saju_profiles")
            .select("dominant_element, personality_traits, romance_style, romance_key_points, ideal_match")
            .eq("id", profileRow.saju_profile_id)
            .maybeSingle();
          if (!cancelled && saju) setSajuProfile(saju as SajuProfileRow);
        }
        if (profileRow.gwansang_profile_id) {
          const { data: gwansang } = await supabase
            .from("gwansang_profiles")
            .select("animal_type_korean, animal_modifier, romance_summary, charm_keywords, ideal_match_animal_korean")
            .eq("id", profileRow.gwansang_profile_id)
            .maybeSingle();
          if (!cancelled && gwansang) setGwansangProfile(gwansang as GwansangProfileRow);
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 공유 URL
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/share-url");
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled && data.url) setShareUrl(data.url);
    })();
    return () => { cancelled = true; };
  }, []);

  // 궁합 리스트 수 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/compatibility-list");
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled && json.ok && Array.isArray(json.data)) setCompatCount(json.data.length);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // 매칭 통계 + 블러해시 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/matching-stats");
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled && json.ok) {
          setUserCount(json.count ?? 0);
          setBlurHashes(json.blurHashes ?? []);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // 미완료 유저 리다이렉트
  useEffect(() => {
    if (!dataLoading && !profile) {
      let cancelled = false;
      (async () => {
        const res = await fetch("/api/onboarding-step", { credentials: "include" });
        if (cancelled) return;
        if (!res.ok) { router.replace(ROUTES.HOME); return; }
        const data = await res.json();
        if (cancelled) return;
        const step = data.step === "result" ? 0 : Number(data.step);
        if (Number.isNaN(step) || step < 0) { router.replace(ROUTES.HOME); return; }
        router.replace(`${ROUTES.ONBOARDING}?step=${step}`);
      })();
      return () => { cancelled = true; };
    }
  }, [dataLoading, profile, router]);

  // 파생 값
  const nickname = profile?.name ?? "";
  const dominantEl = profile?.dominant_element ?? sajuProfile?.dominant_element ?? null;
  const elKey = elementKey(dominantEl);
  const accentColor = ELEMENT_COLORS[elKey]?.main ?? ELEMENT_COLORS.metal.main;
  const isVerified = profile?.is_phone_verified === true;

  const romanceType = classifyRomanceType({
    dominantElement: dominantEl,
    personalityTraits: sajuProfile?.personality_traits ?? null,
    romanceKeyPoints: sajuProfile?.romance_key_points ?? null,
    romanceStyle: sajuProfile?.romance_style ?? null,
  });

  const idealMatch = sajuProfile?.ideal_match;
  const idealElement = idealMatch?.traits ? guessElementFromTraits(idealMatch.traits) : null;

  const handleShare = async () => {
    if (!shareUrl || typeof window === "undefined") return;
    trackClickShareInResult();
    try {
      if (navigator.share) {
        await navigator.share({ title: `${nickname}님의 이상형 결과`, url: shareUrl });
        return;
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.prompt("링크를 복사해 주세요:", shareUrl);
    }
  };

  if (dataLoading || (!profile && !dataLoading)) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col items-center justify-center">
        <p className="text-ink-muted text-sm">{dataLoading ? "불러오는 중..." : "이동 중..."}</p>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer className="h-dvh max-h-dvh bg-hanji text-ink flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-touch">
        {/* 히어로 */}
        <MatchingHero
          nickname={nickname}
          profileImage={profile?.profile_images?.[0] ?? null}
          characterType={profile?.character_type ?? null}
          dominantElement={dominantEl}
          romanceTypeLabel={romanceType.subtitle}
          idealMatchDescription={idealMatch?.description ?? null}
          idealMatchElement={idealElement}
          animalTypeKorean={gwansangProfile?.animal_type_korean ?? null}
          animalModifier={gwansangProfile?.animal_modifier ?? null}
          blurHashes={blurHashes}
        />

        <div className="space-y-4 pb-8">
          {/* 매칭 카운터 — 히어로 바로 아래, 가장 눈에 띄는 위치 */}
          <MatchingCounter
            accentColor={accentColor}
            isVerified={isVerified}
            userCount={userCount}
          />

          {/* 사주 연애운 */}
          <SajuRomanceCard
            romanceStyle={sajuProfile?.romance_style ?? null}
            romanceKeyPoints={sajuProfile?.romance_key_points ?? null}
            accentColor={accentColor}
          />

          {/* 관상 연애운 */}
          <GwansangRomanceCard
            animalTypeKorean={gwansangProfile?.animal_type_korean ?? null}
            animalModifier={gwansangProfile?.animal_modifier ?? null}
            romanceSummary={gwansangProfile?.romance_summary ?? null}
            charmKeywords={gwansangProfile?.charm_keywords ?? null}
          />

          {/* 궁합 리스트 / 공유 CTA */}
          <section className="px-5">
            {compatCount > 0 ? (
              <div>
                <p className="text-xs text-ink-muted mb-3">궁합 본 친구 ({compatCount}명)</p>
                <Link
                  href={ROUTES.RESULT_COMPAT}
                  className="block rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low active:bg-hanji-secondary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">궁합 결과 보기</span>
                    <svg width={16} height={16} viewBox="0 0 20 20" fill="none" aria-hidden>
                      <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleShare}
                className="w-full rounded-2xl border border-hanji-border bg-hanji-elevated p-4 shadow-low text-center active:bg-hanji-secondary transition-colors"
              >
                <p className="text-sm font-medium text-ink">친구와 궁합 보기</p>
                <p className="mt-1 text-[12px] text-ink-muted">링크를 공유하면 사주 궁합을 알 수 있어요</p>
              </button>
            )}
          </section>
        </div>
      </div>

      {/* CTA */}
      <CtaBar className="shrink-0">
        {isVerified ? (
          <Button size="lg" className="w-full" onClick={handleShare}>
            {shareCopied ? "링크가 복사됐어요!" : "친구에게 공유하기"}
          </Button>
        ) : (
          <>
            <Link href={ROUTES.COMPLETE} className="block">
              <Button size="lg" className="w-full" style={{ backgroundColor: accentColor, borderColor: accentColor }}>
                매칭 등록하기
              </Button>
            </Link>
            <Button variant="outline" size="md" className="w-full mt-4" onClick={handleShare} disabled={!shareUrl}>
              {shareCopied ? "링크가 복사됐어요!" : "친구에게 공유하기"}
            </Button>
          </>
        )}
      </CtaBar>
    </MobileContainer>
  );
}
