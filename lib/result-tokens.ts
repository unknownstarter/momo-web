/**
 * 결과 페이지 UI 토큰 — 앱(AppTheme, SajuSpacing)과 1:1 매핑.
 * 오행 색상, 캐릭터 한글명, 천간·지지 한자 등.
 */

export const ELEMENT_COLORS: Record<string, { main: string; pastel: string }> = {
  wood: { main: "#8FB89A", pastel: "#D4E4D7" },
  fire: { main: "#D4918E", pastel: "#F0D4D2" },
  earth: { main: "#C8B68E", pastel: "#E8DFC8" },
  metal: { main: "#B8BCC0", pastel: "#E0E2E4" },
  water: { main: "#89B0CB", pastel: "#C8DBEA" },
};

export const ELEMENT_KOREAN: Record<keyof typeof ELEMENT_COLORS, string> = {
  wood: "목", fire: "화", earth: "토", metal: "금", water: "수",
};
export const ELEMENT_HANJA: Record<keyof typeof ELEMENT_COLORS, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

/** dominant_element 값(한글/영어) → Tailwind element-* 클래스용 키 */
export function elementKey(str: string | null | undefined): keyof typeof ELEMENT_COLORS {
  if (!str) return "metal";
  const s = String(str).toLowerCase();
  if (s === "목" || s === "wood") return "wood";
  if (s === "화" || s === "fire") return "fire";
  if (s === "토" || s === "earth") return "earth";
  if (s === "금" || s === "metal") return "metal";
  if (s === "수" || s === "water") return "water";
  return "metal";
}

/** character_type(DB) → 한글 캐릭터 이름 (앱 SajuBadge 표기) */
export const CHARACTER_NAMES: Record<string, string> = {
  namuri: "나무리",
  bulkkori: "불꼬리",
  heuksuni: "흑수니",
  soedongi: "쇠동이",
  mulgyeori: "물겨리",
};

/** 오행(본성) → 캐릭터 타입. 본성에 맞는 캐릭터가 나오도록 매핑. */
export const ELEMENT_TO_CHARACTER: Record<keyof typeof ELEMENT_COLORS, string> = {
  wood: "namuri",   // 목 → 나무리
  fire: "bulkkori", // 화 → 불꼬리
  earth: "heuksuni", // 토 → 흑수니
  metal: "soedongi", // 금 → 쇠동이
  water: "mulgyeori", // 수 → 물겨리
};

/** dominant_element(한글/영어) → character_type. 없으면 namuri. */
export function getCharacterTypeFromElement(dominantElement: string | null | undefined): string {
  const key = elementKey(dominantElement);
  return ELEMENT_TO_CHARACTER[key] ?? "namuri";
}

/** 천간 한글 → 한자 */
export const HANJA_STEMS: Record<string, string> = {
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
};
/** 지지 한글 → 한자 */
export const HANJA_BRANCHES: Record<string, string> = {
  자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥",
};

export function getStemHanja(stem: string | undefined): string {
  return (stem && HANJA_STEMS[stem]) ?? stem ?? "?";
}
export function getBranchHanja(branch: string | undefined): string {
  return (branch && HANJA_BRANCHES[branch]) ?? branch ?? "?";
}

/** 연애/운세 등 시맨틱 색 (앱 AppTheme) */
export const ROMANCE_COLOR = "#E91E63";
export const FORTUNE_GOOD = "#4CAF50";
export const FORTUNE_CAUTION = "#F44336";
export const FORTUNE_WARM = "#E65100";
export const MYSTIC_GLOW = "#C8B68E";
export const MYSTIC_ACCENT = "#D4C9A8";
