"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { ROUTES } from "@/lib/constants";

/**
 * 결과 데이터 연동 시 참고 (docs/design/onboarding-analysis-flow.md §6.2, §6.3)
 * - 사주: profiles + saju_profiles (year_pillar, month_pillar, day_pillar, hour_pillar, five_elements, personality_traits, ai_interpretation, yearly_fortune, period_fortunes, romance_style, romance_key_points, ideal_match)
 * - 관상: gwansang_profiles (animal_type, animal_type_korean, animal_modifier, headline, charm_keywords, samjeong, ogwan, personality_summary, romance_summary, romance_key_points, traits(5축), ideal_match_*)
 * - 이름: profiles.name
 */
/** 앱 DestinyResultPage 사주 탭 섹션 순서 (onboarding-analysis-flow.md 5.2). 데이터는 saju_profiles 스키마 기준. */
const SAJU_SECTIONS = [
  { title: "캐릭터 인사", key: "greeting" },
  { title: "사주팔자 (四柱八字)", key: "fourPillars" },
  { title: "오행 분포 (五行)", key: "fiveElements" },
  { title: "성격 특성", key: "personality" },
  { title: "AI 사주 해석", key: "interpretation" },
  { title: "올해 운세", key: "yearlyFortune" },
  { title: "시기별 운세", key: "periodFortune" },
  { title: "연애 스타일", key: "romanceStyle" },
  { title: "연애 핵심 포인트", key: "romanceKeyPoints" },
  { title: "이상형 사주", key: "idealMatch" },
];

/** 앱 DestinyResultPage 관상 탭 섹션 순서 (onboarding-analysis-flow.md 5.3). 데이터는 gwansang_profiles 스키마 기준. */
const GWANSANG_SECTIONS = [
  { title: "동물상 히어로", key: "animalHero" },
  { title: "헤드라인", key: "headline" },
  { title: "매력 키워드", key: "charmKeywords" },
  { title: "삼정(三停) 운세", key: "samjeong" },
  { title: "오관(五官) 해석", key: "ogwan" },
  { title: "성격 요약", key: "personalitySummary" },
  { title: "연애 스타일", key: "romanceStyle" },
  { title: "연애 핵심 포인트", key: "romanceKeyPoints" },
  { title: "성격 특성 5축", key: "fiveAxis" },
  { title: "이상형 관상", key: "idealMatch" },
];

function ResultSectionCard({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-hanji-border bg-hanji-elevated p-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {children != null ? <div className="mt-3 text-sm text-ink leading-relaxed">{children}</div> : null}
    </div>
  );
}

function renderSajuSection(key: string, s: SajuProfileRow | null): React.ReactNode {
  if (!s) return null;
  switch (key) {
    case "greeting":
      return "캐릭터 인사 문구 (연동 후 표시)";
    case "fourPillars": {
      const y = s.year_pillar as { stem?: string; branch?: string };
      const m = s.month_pillar as { stem?: string; branch?: string };
      const d = s.day_pillar as { stem?: string; branch?: string };
      const h = s.hour_pillar as { stem?: string; branch?: string } | null;
      return (
        <p>
          연주 {y?.stem}{y?.branch} · 월주 {m?.stem}{m?.branch} · 일주 {d?.stem}{d?.branch}
          {h ? ` · 시주 ${h.stem}${h.branch}` : ""}
        </p>
      );
    }
    case "fiveElements": {
      const el = s.five_elements;
      if (!el) return null;
      const parts = Object.entries(el).map(([k, v]) => `${k} ${v}`).join(", ");
      return <p>{parts}</p>;
    }
    case "personality":
      return s.personality_traits?.length ? <p>{s.personality_traits.join(" · ")}</p> : null;
    case "interpretation":
      return s.ai_interpretation ? <p className="whitespace-pre-wrap">{s.ai_interpretation}</p> : null;
    case "yearlyFortune": {
      const yf = s.yearly_fortune as { year?: number; yearPillar?: string; summary?: string } | null;
      return yf?.summary ? <p>{yf.summary}</p> : null;
    }
    case "periodFortune":
      return "시기별 운세 (연동 후 표시)";
    case "romanceStyle":
      return s.romance_style ? <p>{s.romance_style}</p> : null;
    case "romanceKeyPoints":
      return s.romance_key_points?.length ? <ul className="list-disc pl-4">{s.romance_key_points.map((x, i) => <li key={i}>{x}</li>)}</ul> : null;
    case "idealMatch": {
      const im = s.ideal_match as { description?: string; traits?: string[] } | null;
      return im?.description ? <p>{im.description}</p> : null;
    }
    default:
      return null;
  }
}

function renderGwansangSection(key: string, g: GwansangProfileRow | null): React.ReactNode {
  if (!g) return null;
  switch (key) {
    case "animalHero":
      return <p>{g.animal_modifier} {g.animal_type_korean}</p>;
    case "headline":
      return g.headline ? <p>{g.headline}</p> : null;
    case "charmKeywords":
      return g.charm_keywords?.length ? <p className="text-center">{g.charm_keywords.join(" · ")}</p> : null;
    case "samjeong": {
      const sj = g.samjeong as { upper?: string; middle?: string; lower?: string };
      return (sj?.upper || sj?.middle || sj?.lower) ? (
        <div className="space-y-2">
          {sj.upper && <p>{sj.upper}</p>}
          {sj.middle && <p>{sj.middle}</p>}
          {sj.lower && <p>{sj.lower}</p>}
        </div>
      ) : null;
    }
    case "ogwan": {
      const og = g.ogwan as Record<string, string>;
      if (!og || !Object.keys(og).length) return null;
      return (
        <div className="space-y-1">
          {Object.entries(og).map(([k, v]) => (v ? <p key={k}><strong>{k}:</strong> {v}</p> : null))}
        </div>
      );
    }
    case "personalitySummary":
      return g.personality_summary ? <p>{g.personality_summary}</p> : null;
    case "romanceStyle":
      return g.romance_summary ? <p>{g.romance_summary}</p> : null;
    case "romanceKeyPoints":
      return g.romance_key_points?.length ? <ul className="list-disc pl-4">{g.romance_key_points.map((x, i) => <li key={i}>{x}</li>)}</ul> : null;
    case "fiveAxis": {
      const t = g.traits;
      if (!t || !Object.keys(t).length) return null;
      return (
        <div className="space-y-2">
          {Object.entries(t).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-24 text-ink-muted">{k}</span>
              <div className="flex-1 h-2 bg-ink/10 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${Number(v)}%` }} />
              </div>
              <span className="text-xs">{v}</span>
            </div>
          ))}
        </div>
      );
    }
    case "idealMatch":
      return g.ideal_match_description ? <p>{g.ideal_match_description}</p> : null;
    default:
      return null;
  }
}

interface SajuProfileRow {
  id: string;
  year_pillar: unknown;
  month_pillar: unknown;
  day_pillar: unknown;
  hour_pillar: unknown;
  five_elements: Record<string, number>;
  dominant_element: string;
  personality_traits: string[] | null;
  ai_interpretation: string | null;
  ideal_match: unknown;
  romance_style: string | null;
  romance_key_points: string[] | null;
  period_fortunes: unknown;
  yearly_fortune: unknown;
}

interface GwansangProfileRow {
  id: string;
  animal_type: string;
  animal_type_korean: string;
  animal_modifier: string;
  headline: string;
  personality_summary: string;
  romance_summary: string;
  romance_key_points: string[] | null;
  charm_keywords: string[] | null;
  samjeong: unknown;
  ogwan: unknown;
  traits: Record<string, number>;
  ideal_match_animal: string | null;
  ideal_match_animal_korean: string | null;
  ideal_match_traits: string[] | null;
  ideal_match_description: string | null;
}

export default function ResultPage() {
  const [tab, setTab] = useState<"saju" | "gwansang">("saju");
  const [headerView, setHeaderView] = useState<"name" | "animal">("name");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [profile, setProfile] = useState<{ name: string | null; animal_type: string | null; character_type: string | null; profile_images: string[] | null } | null>(null);
  const [sajuProfile, setSajuProfile] = useState<SajuProfileRow | null>(null);
  const [gwansangProfile, setGwansangProfile] = useState<GwansangProfileRow | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("momo_display_name");
    setDisplayName(stored || null);
  }, []);

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
          .select("id, name, animal_type, character_type, profile_images, saju_profile_id, gwansang_profile_id")
          .eq("auth_id", user.id)
          .maybeSingle();
        if (!profileRow || cancelled) {
          setDataLoading(false);
          return;
        }
        setProfile({
          name: profileRow.name,
          animal_type: profileRow.animal_type,
          character_type: profileRow.character_type,
          profile_images: profileRow.profile_images,
        });
        if (profileRow.saju_profile_id) {
          const { data: saju } = await supabase
            .from("saju_profiles")
            .select("*")
            .eq("id", profileRow.saju_profile_id)
            .maybeSingle();
          if (!cancelled && saju) setSajuProfile(saju as SajuProfileRow);
        }
        if (profileRow.gwansang_profile_id) {
          const { data: gwansang } = await supabase
            .from("gwansang_profiles")
            .select("*")
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

  useEffect(() => {
    if (profile?.name) setDisplayName(profile.name);
  }, [profile?.name]);

  // 공유 URL은 서버에서 암호화 토큰으로 발급 (프로필 ID 노출 방지)
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

  const handleShare = async () => {
    if (!shareUrl || typeof window === "undefined") return;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <MobileContainer className="h-dvh max-h-dvh bg-hanji text-ink flex flex-col overflow-hidden">
      {/* 고정 앱바: 캐릭터 + 이름/동물상 토글 + 한줄요약 영역 (앱 5.1) */}
      <header className="shrink-0 px-5 pt-8 pb-6">
        <div className="flex flex-col items-center">
          <div className="relative w-[140px] h-[120px] flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-[3px] border-element-metal/30 bg-element-metal-pastel overflow-hidden shrink-0 flex items-center justify-center">
              <Image
                src="/images/characters/mulgyeori/default.png"
                alt=""
                width={64}
                height={64}
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="absolute right-0 bottom-0 min-w-[48px] min-h-[48px] px-3 py-2.5 rounded-full bg-hanji border-2 border-brand/30 shadow-md flex items-center justify-center">
              <span className="text-ink text-[13px] font-bold">동물상</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setHeaderView("name")}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                headerView === "name" ? "bg-brand/20 text-ink" : "bg-ink/10 text-ink-tertiary"
              }`}
            >
              이름
            </button>
            <button
              type="button"
              onClick={() => setHeaderView("animal")}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                headerView === "animal" ? "bg-brand/20 text-ink" : "bg-ink/10 text-ink-tertiary"
              }`}
            >
              동물상
            </button>
          </div>
          <p className="mt-2 text-sm text-ink-muted text-center min-h-[20px]">
            {headerView === "name" && displayName
              ? `${displayName}님의 사주`
              : headerView === "animal" && gwansangProfile
                ? `${gwansangProfile.animal_modifier || ""} ${gwansangProfile.animal_type_korean || "동물상"}`.trim() || "동물상 요약"
                : !dataLoading && !displayName
                  ? "프로필 연동 후 이름이 표시돼요"
                  : headerView === "animal"
                    ? "동물상 요약"
                    : null}
          </p>
        </div>
      </header>

      {/* 탭바 고정 (사주 | 관상) */}
      <div className="shrink-0 bg-hanji border-b border-hanji-border">
        <div className="flex">
          <button
            type="button"
            onClick={() => setTab("saju")}
            className={`flex-1 py-3 text-[15px] font-semibold ${
              tab === "saju" ? "text-ink border-b-2 border-ink" : "text-ink-tertiary"
            }`}
          >
            사주
          </button>
          <button
            type="button"
            onClick={() => setTab("gwansang")}
            className={`flex-1 py-3 text-[15px] font-semibold ${
              tab === "gwansang" ? "text-ink border-b-2 border-ink" : "text-ink-tertiary"
            }`}
          >
            관상
          </button>
        </div>
      </div>

      {/* 스크롤 영역만 overflow — 위 앱바·탭바 고정 */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 pt-6 pb-8">
        {tab === "saju" && (
          <div className="space-y-6">
            {SAJU_SECTIONS.map((s) => (
              <ResultSectionCard key={s.key} title={s.title}>
                {renderSajuSection(s.key, sajuProfile)}
              </ResultSectionCard>
            ))}
          </div>
        )}
        {tab === "gwansang" && (
          <div className="space-y-6">
            {GWANSANG_SECTIONS.map((s) => (
              <ResultSectionCard key={s.key} title={s.title}>
                {renderGwansangSection(s.key, gwansangProfile)}
              </ResultSectionCard>
            ))}
          </div>
        )}
      </div>

      <CtaBar className="shrink-0">
        <Link href={ROUTES.COMPLETE} className="block">
          <Button size="lg" className="w-full flex items-center justify-center gap-2">
            <span aria-hidden>♥</span>
            내 사주와 찰떡인 사람, 만나볼까요?
          </Button>
        </Link>
        <Button
          variant="outline"
          size="md"
          className="w-full mt-4"
          onClick={handleShare}
          disabled={!shareUrl}
        >
          {shareCopied ? "링크가 복사됐어요!" : "친구에게 공유하기"}
        </Button>
      </CtaBar>
    </MobileContainer>
  );
}
