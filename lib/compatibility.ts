/**
 * 궁합 비즈니스 로직 모듈.
 * saju_compatibility 테이블 읽기/쓰기 + Edge Function 호출.
 * 서버 전용 — 클라이언트 컴포넌트에서 직접 import 금지.
 */

import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompatibilityResult {
  id: string;
  partnerId: string;
  partnerName: string | null;
  partnerCharacterType: string | null;
  partnerDominantElement: string | null;
  partnerGender: string | null;
  myGender: string | null;
  score: number;
  fiveElementScore: number | null;
  dayPillarScore: number | null;
  overallAnalysis: string | null;
  strengths: string[];
  challenges: string[];
  advice: string | null;
  aiStory: string | null;
  relationType: "friend" | "romantic";
  calculatedAt: string | null;
}

interface SajuPillar {
  stem?: string;
  branch?: string;
  heavenlyStem?: string;
  earthlyBranch?: string;
}

interface SajuForCompat {
  yearPillar: SajuPillar;
  monthPillar: SajuPillar;
  dayPillar: SajuPillar;
  hourPillar: SajuPillar | null;
  fiveElements: Record<string, number>;
  dominantElement: string;
}

interface PartnerDetail {
  name: string | null;
  character_type: string | null;
  dominant_element: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveRelationType(
  myGender: string | null,
  partnerGender: string | null,
): "friend" | "romantic" {
  if (myGender && partnerGender && myGender !== partnerGender) {
    return "romantic";
  }
  return "friend";
}

/**
 * SajuPillar의 stem/branch 키 이름이 camelCase 또는 snake 형태일 수 있으므로
 * 양쪽 모두 처리하여 { stem, branch } 형태로 정규화한다.
 */
function normalizePillar(
  pillar: SajuPillar | null | undefined,
): { stem: string; branch: string } | null {
  if (!pillar) return null;
  return {
    stem: pillar.stem ?? pillar.heavenlyStem ?? "",
    branch: pillar.branch ?? pillar.earthlyBranch ?? "",
  };
}

// ---------------------------------------------------------------------------
// 내부: fetchSajuForCompat
// ---------------------------------------------------------------------------

async function fetchSajuForCompat(
  profileId: string,
): Promise<SajuForCompat | null> {
  const supabase = createAdminClient();

  // profiles에서 saju_profile_id 조회
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("saju_profile_id")
    .eq("id", profileId)
    .maybeSingle();

  if (profileErr || !profile?.saju_profile_id) return null;

  // saju_profiles에서 사주 데이터 조회
  const { data: saju, error: sajuErr } = await supabase
    .from("saju_profiles")
    .select(
      "year_pillar, month_pillar, day_pillar, hour_pillar, five_elements, dominant_element",
    )
    .eq("id", profile.saju_profile_id)
    .maybeSingle();

  if (sajuErr || !saju) return null;

  return {
    yearPillar: saju.year_pillar as SajuPillar,
    monthPillar: saju.month_pillar as SajuPillar,
    dayPillar: saju.day_pillar as SajuPillar,
    hourPillar: (saju.hour_pillar as SajuPillar) ?? null,
    fiveElements: (saju.five_elements as Record<string, number>) ?? {},
    dominantElement: (saju.dominant_element as string) ?? "",
  };
}

// ---------------------------------------------------------------------------
// 1. fetchCachedCompatibility
// ---------------------------------------------------------------------------

/**
 * saju_compatibility 테이블에서 캐시된 궁합 결과를 양방향 조회.
 * 없으면 null.
 */
export async function fetchCachedCompatibility(
  myProfileId: string,
  partnerProfileId: string,
): Promise<CompatibilityResult | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("saju_compatibility")
    .select("*")
    .or(
      `and(user_id.eq.${myProfileId},partner_id.eq.${partnerProfileId}),and(user_id.eq.${partnerProfileId},partner_id.eq.${myProfileId})`,
    )
    .maybeSingle();

  if (error || !data) return null;

  const iAmUser = data.user_id === myProfileId;
  const partnerId = iAmUser ? data.partner_id : data.user_id;
  const myGender = iAmUser ? data.user_gender : data.partner_gender;
  const partnerGender = iAmUser ? data.partner_gender : data.user_gender;

  // 상대 프로필 조회 (이름, 캐릭터 타입, 주요 오행)
  const { data: partner } = await supabase
    .from("profiles")
    .select("name, character_type, dominant_element")
    .eq("id", partnerId)
    .maybeSingle();

  const partnerDetail: PartnerDetail = partner ?? {
    name: null,
    character_type: null,
    dominant_element: null,
  };

  return {
    id: data.id,
    partnerId,
    partnerName: partnerDetail.name,
    partnerCharacterType: partnerDetail.character_type,
    partnerDominantElement: partnerDetail.dominant_element,
    partnerGender,
    myGender,
    score: data.total_score ?? 0,
    fiveElementScore: data.five_element_score ?? null,
    dayPillarScore: data.day_pillar_score ?? null,
    overallAnalysis: data.overall_analysis ?? null,
    strengths: (data.strengths as string[]) ?? [],
    challenges: (data.challenges as string[]) ?? [],
    advice: data.advice ?? null,
    aiStory: data.ai_story ?? null,
    relationType: deriveRelationType(myGender, partnerGender),
    calculatedAt: data.calculated_at ?? null,
  };
}

// ---------------------------------------------------------------------------
// 2. computeCompatibility
// ---------------------------------------------------------------------------

/**
 * 궁합 계산 실행.
 * 1) 캐시 확인 → 있으면 즉시 반환
 * 2) 양쪽 사주 조회 + Edge Function 호출
 * 3) upsert 후 결과 직접 구성 반환
 */
export async function computeCompatibility(
  myProfileId: string,
  partnerProfileId: string,
  accessToken: string,
): Promise<CompatibilityResult | null> {
  // 유저 토큰 클라이언트 (RPC + Edge Function 호출용)
  const authedClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  // 1) 캐시 확인
  const cached = await fetchCachedCompatibility(myProfileId, partnerProfileId);
  if (cached) {
    // ⚠️ 캐시 히트여도 compat_connections에 기록해야 함!
    // 앱 batch가 생성한 레코드가 캐시에 있을 수 있고,
    // 그래도 유저가 의도적으로 궁합을 확인한 관계는 기록되어야 리스트에 표시됨.
    await authedClient
      .rpc("fn_record_compat_connection", { p_partner_id: partnerProfileId })
      .then(({ error: rpcErr }) => {
        if (rpcErr) console.error("[compat_connections] cache-hit rpc failed:", rpcErr.message);
      });
    return cached;
  }

  const supabase = createAdminClient();

  // 2) 양쪽 프로필 기본 정보 (id, name, gender)
  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("id, name, gender, character_type, dominant_element")
    .in("id", [myProfileId, partnerProfileId]);

  if (profilesErr || !profiles || profiles.length < 2) return null;

  const myProfile = profiles.find((p) => p.id === myProfileId)!;
  const partnerProfile = profiles.find((p) => p.id === partnerProfileId)!;

  // gender 없으면 NOT NULL 위반 방지로 null 반환
  if (!myProfile.gender || !partnerProfile.gender) return null;

  // 3) 양쪽 사주 데이터 조회
  const [mySaju, partnerSaju] = await Promise.all([
    fetchSajuForCompat(myProfileId),
    fetchSajuForCompat(partnerProfileId),
  ]);

  if (!mySaju || !partnerSaju) return null;

  // 4) Edge Function 호출 (authedClient는 함수 상단에서 이미 생성됨)
  const payload = {
    mySaju: {
      yearPillar: normalizePillar(mySaju.yearPillar),
      monthPillar: normalizePillar(mySaju.monthPillar),
      dayPillar: normalizePillar(mySaju.dayPillar),
      hourPillar: normalizePillar(mySaju.hourPillar),
      fiveElements: mySaju.fiveElements,
      dominantElement: mySaju.dominantElement,
    },
    partnerSaju: {
      yearPillar: normalizePillar(partnerSaju.yearPillar),
      monthPillar: normalizePillar(partnerSaju.monthPillar),
      dayPillar: normalizePillar(partnerSaju.dayPillar),
      hourPillar: normalizePillar(partnerSaju.hourPillar),
      fiveElements: partnerSaju.fiveElements,
      dominantElement: partnerSaju.dominantElement,
    },
  };

  const { data: calcResult, error: calcErr } = await authedClient.functions.invoke(
    "calculate-compatibility",
    {
      body: payload,
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (calcErr || !calcResult) return null;

  const result = calcResult as Record<string, unknown>;

  // 5) upsert — user_gender, partner_gender 필수 포함
  const now = new Date().toISOString();
  const upsertRow = {
    user_id: myProfileId,
    partner_id: partnerProfileId,
    user_gender: myProfile.gender,
    partner_gender: partnerProfile.gender,
    total_score: (result.score ?? result.totalScore ?? result.total_score ?? 0) as number,
    five_element_score: (result.fiveElementScore ?? result.five_element_score ?? null) as number | null,
    day_pillar_score: (result.dayPillarScore ?? result.day_pillar_score ?? null) as number | null,
    overall_analysis: (result.overallAnalysis ?? result.overall_analysis ?? null) as string | null,
    strengths: (result.strengths ?? []) as string[],
    challenges: (result.challenges ?? []) as string[],
    advice: (result.advice ?? null) as string | null,
    is_detailed: false,
    calculated_at: now,
  };

  const { data: upserted, error: upsertErr } = await supabase
    .from("saju_compatibility")
    .upsert(upsertRow, { onConflict: "user_id,partner_id" })
    .select("id")
    .single();

  if (upsertErr || !upserted) return null;

  // 6) generate-match-story fire-and-forget (이성 + 동성 모두)
  // Edge Function이 myGender/partnerGender로 romantic/friend 자동 판단
  const relationType = deriveRelationType(myProfile.gender, partnerProfile.gender);
  authedClient.functions
    .invoke("generate-match-story", {
      body: {
        userId: myProfileId,
        partnerId: partnerProfileId,
        myName: myProfile.name ?? "나",
        partnerName: partnerProfile.name ?? "상대방",
        myGender: myProfile.gender,
        partnerGender: partnerProfile.gender,
        mySaju: {
          dayPillar: normalizePillar(mySaju.dayPillar),
          fiveElements: mySaju.fiveElements,
          dominantElement: mySaju.dominantElement,
        },
        partnerSaju: {
          dayPillar: normalizePillar(partnerSaju.dayPillar),
          fiveElements: partnerSaju.fiveElements,
          dominantElement: partnerSaju.dominantElement,
        },
        score: upsertRow.total_score,
        strengths: upsertRow.strengths,
        challenges: upsertRow.challenges,
      },
    })
    .catch((err: unknown) => {
      console.error("[generate-match-story] fire-and-forget failed:", err);
    });

  // 7) compat_connections에 의도적 궁합 관계 기록 (RPC — 직접 INSERT 불가, RLS)
  // ⚠️ await 필수: 반환 후 loadList()가 바로 호출되므로, 기록 완료 전에 조회되면 리스트에 안 나옴
  const { error: rpcErr } = await authedClient.rpc("fn_record_compat_connection", {
    p_partner_id: partnerProfileId,
  });
  if (rpcErr) console.error("[compat_connections] rpc failed:", rpcErr.message);

  // 8) 결과 직접 구성 (fetchCachedCompatibility 재호출 금지)
  return {
    id: upserted.id,
    partnerId: partnerProfileId,
    partnerName: partnerProfile.name ?? null,
    partnerCharacterType: partnerProfile.character_type ?? null,
    partnerDominantElement: partnerProfile.dominant_element ?? null,
    partnerGender: partnerProfile.gender,
    myGender: myProfile.gender,
    score: upsertRow.total_score,
    fiveElementScore: upsertRow.five_element_score,
    dayPillarScore: upsertRow.day_pillar_score,
    overallAnalysis: upsertRow.overall_analysis,
    strengths: upsertRow.strengths,
    challenges: upsertRow.challenges,
    advice: upsertRow.advice,
    aiStory: null,
    relationType,
    calculatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// 3. fetchCompatibilityList
// ---------------------------------------------------------------------------

/**
 * 내 궁합 전체 목록 조회.
 * compat_connections 기반 — 유저가 의도적으로 확인한 궁합만 표시.
 * (앱의 batch-calculate-compatibility가 생성한 매칭 추천용 레코드 제외)
 */
export async function fetchCompatibilityList(
  myProfileId: string,
): Promise<CompatibilityResult[]> {
  const supabase = createAdminClient();

  // compat_connections에서 의도적 궁합만 조회 + saju_compatibility JOIN
  const { data: connections, error } = await supabase
    .from("compat_connections")
    .select(`
      id,
      user_id,
      partner_id,
      user_gender,
      partner_gender,
      compatibility_id,
      created_at,
      saju_compatibility (
        total_score,
        five_element_score,
        day_pillar_score,
        overall_analysis,
        strengths,
        challenges,
        advice,
        ai_story,
        calculated_at
      )
    `)
    .or(`user_id.eq.${myProfileId},partner_id.eq.${myProfileId}`)
    .order("created_at", { ascending: false });

  if (error || !connections || connections.length === 0) return [];

  // 상대 ID 수집 → 배치 프로필 조회
  const partnerIds = connections.map((c) =>
    c.user_id === myProfileId ? c.partner_id : c.user_id,
  );
  const uniquePartnerIds = [...new Set(partnerIds)];

  const { data: partnerProfiles } = await supabase
    .from("profiles")
    .select("id, name, character_type, dominant_element")
    .in("id", uniquePartnerIds);

  const partnerMap = new Map<string, PartnerDetail>();
  if (partnerProfiles) {
    for (const p of partnerProfiles) {
      partnerMap.set(p.id, {
        name: p.name,
        character_type: p.character_type,
        dominant_element: p.dominant_element,
      });
    }
  }

  return connections.map((conn) => {
    const iAmUser = conn.user_id === myProfileId;
    const partnerId = iAmUser ? conn.partner_id : conn.user_id;
    const myGender = iAmUser ? conn.user_gender : conn.partner_gender;
    const partnerGender = iAmUser ? conn.partner_gender : conn.user_gender;
    const detail = partnerMap.get(partnerId);

    // saju_compatibility JOIN 결과 (FK nullable → 배열 or 객체 or null)
    const raw = conn.saju_compatibility;
    const compat = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | null | undefined;

    return {
      id: conn.id,
      partnerId,
      partnerName: detail?.name ?? null,
      partnerCharacterType: detail?.character_type ?? null,
      partnerDominantElement: detail?.dominant_element ?? null,
      partnerGender,
      myGender,
      score: (compat?.total_score as number) ?? 0,
      fiveElementScore: (compat?.five_element_score as number | null) ?? null,
      dayPillarScore: (compat?.day_pillar_score as number | null) ?? null,
      overallAnalysis: (compat?.overall_analysis as string | null) ?? null,
      strengths: (compat?.strengths as string[]) ?? [],
      challenges: (compat?.challenges as string[]) ?? [],
      advice: (compat?.advice as string | null) ?? null,
      aiStory: (compat?.ai_story as string | null) ?? null,
      relationType: deriveRelationType(myGender, partnerGender),
      calculatedAt: (compat?.calculated_at as string | null) ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// 4. fetchCompatibilityAiStory
// ---------------------------------------------------------------------------

/**
 * 궁합 AI 스토리만 조회 (폴링용).
 * 양방향 조회.
 */
export async function fetchCompatibilityAiStory(
  myProfileId: string,
  partnerProfileId: string,
): Promise<{ aiStory: string | null }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("saju_compatibility")
    .select("ai_story")
    .or(
      `and(user_id.eq.${myProfileId},partner_id.eq.${partnerProfileId}),and(user_id.eq.${partnerProfileId},partner_id.eq.${myProfileId})`,
    )
    .maybeSingle();

  if (error || !data) return { aiStory: null };
  return { aiStory: (data.ai_story as string) ?? null };
}
