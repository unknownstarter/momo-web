/**
 * 연애 유형 분류 — 기존 사주·관상 데이터에서 10종 라벨 결정.
 * Supabase DB 변경 없이, 클라이언트/서버 양쪽에서 사용 가능한 순수 함수.
 */

export interface RomanceType {
  id: string;
  label: string;
  subtitle: string;
  emoji: string;
}

const ROMANCE_TYPES: RomanceType[] = [
  { id: "passionate-all-in", label: "올인 직진형", subtitle: "한 번 빠지면 끝까지 가는 타입", emoji: "🔥" },
  { id: "emotional-romantic", label: "감성 로맨티스트형", subtitle: "분위기와 감정에 올인하는 타입", emoji: "🌙" },
  { id: "stable-seeker", label: "안정 추구형", subtitle: "확실하지 않으면 불안한 타입", emoji: "🏠" },
  { id: "devoted-carer", label: "헌신 케어형", subtitle: "사랑하는 사람을 끝까지 챙기는 타입", emoji: "💝" },
  { id: "growth-partner", label: "성장 동반자형", subtitle: "함께 성장하는 관계를 꿈꾸는 타입", emoji: "🌱" },
  { id: "soulmate-seeker", label: "소울메이트 추구형", subtitle: "깊은 내면의 연결을 중시하는 타입", emoji: "✨" },
  { id: "cool-tsundere", label: "쿨한 츤데레형", subtitle: "겉은 무심한데 속은 따뜻한 타입", emoji: "😏" },
  { id: "rational-planner", label: "이성적 전략가형", subtitle: "머리로 사랑하는 계획적인 타입", emoji: "🧠" },
  { id: "intuitive-free", label: "직감형 자유영혼", subtitle: "느낌 가는 대로 사랑하는 타입", emoji: "🌊" },
  { id: "adventurous-explorer", label: "모험가형", subtitle: "새로운 경험을 함께할 인연을 찾는 타입", emoji: "🗺️" },
];

/** 오행 → 후보 유형 2개 매핑 (1차 필터) */
const ELEMENT_TYPE_MAP: Record<string, [string, string]> = {
  fire:  ["passionate-all-in", "emotional-romantic"],
  earth: ["stable-seeker", "devoted-carer"],
  wood:  ["growth-partner", "soulmate-seeker"],
  metal: ["cool-tsundere", "rational-planner"],
  water: ["intuitive-free", "adventurous-explorer"],
};

/** 각 유형의 가중 키워드 (personality_traits + romance_key_points + romance_style 매칭) */
const TYPE_KEYWORDS: Record<string, string[]> = {
  "passionate-all-in":     ["열정", "적극", "직진", "대담", "강렬", "주도", "솔직", "거침없"],
  "emotional-romantic":    ["감성", "낭만", "예술", "감정", "섬세", "분위기", "감각", "표현"],
  "stable-seeker":         ["안정", "신중", "믿음", "확인", "일관", "꾸준", "책임", "신뢰"],
  "devoted-carer":         ["헌신", "배려", "챙김", "따뜻", "보살", "돌봄", "희생", "다정"],
  "growth-partner":        ["성장", "발전", "응원", "목표", "자극", "동기", "비전", "노력"],
  "soulmate-seeker":       ["이해", "공감", "소통", "교감", "깊이", "내면", "연결", "영혼"],
  "cool-tsundere":         ["독립", "자존", "쿨", "카리스마", "무심", "강한", "주관", "거리"],
  "rational-planner":      ["논리", "계획", "분석", "체계", "이성", "판단", "효율", "명확"],
  "intuitive-free":        ["직관", "자유", "유연", "감각", "즉흥", "본능", "흐름", "느낌"],
  "adventurous-explorer":  ["모험", "경험", "탐구", "호기심", "새로운", "도전", "여행", "발견"],
};

interface ClassifyInput {
  dominantElement?: string | null;
  personalityTraits?: string[] | null;
  romanceKeyPoints?: string[] | null;
  romanceStyle?: string | null;
}

/**
 * 기존 사주·관상 데이터로 연애 유형을 결정론적으로 분류.
 * 1) dominant_element → 후보 2개 선택
 * 2) personality_traits + romance_key_points + romance_style에서 키워드 매칭 점수 계산
 * 3) 점수가 높은 후보 반환 (동점 시 첫 번째)
 */
export function classifyRomanceType(input: ClassifyInput): RomanceType {
  const elKey = normalizeElement(input.dominantElement);
  const candidates = ELEMENT_TYPE_MAP[elKey] ?? ELEMENT_TYPE_MAP.metal;

  const corpus = [
    ...(input.personalityTraits ?? []),
    ...(input.romanceKeyPoints ?? []),
    input.romanceStyle ?? "",
  ].join(" ");

  let bestId = candidates[0];
  let bestScore = 0;

  for (const typeId of candidates) {
    const keywords = TYPE_KEYWORDS[typeId] ?? [];
    const score = keywords.reduce((sum, kw) => sum + (corpus.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestId = typeId;
    }
  }

  return ROMANCE_TYPES.find((t) => t.id === bestId)!;
}

function normalizeElement(el: string | null | undefined): string {
  if (!el) return "metal";
  const s = el.toLowerCase();
  if (s === "목" || s === "wood") return "wood";
  if (s === "화" || s === "fire") return "fire";
  if (s === "토" || s === "earth") return "earth";
  if (s === "금" || s === "metal") return "metal";
  if (s === "수" || s === "water") return "water";
  return "metal";
}

export function getRomanceTypeById(id: string): RomanceType | undefined {
  return ROMANCE_TYPES.find((t) => t.id === id);
}

export function getAllRomanceTypes(): readonly RomanceType[] {
  return ROMANCE_TYPES;
}
