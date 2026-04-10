/**
 * 라우트·앱 상수 (Supabase 구조/정책 변경 없음)
 */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  CALLBACK: "/callback",
  ONBOARDING: "/onboarding",
  RESULT_LOADING: "/result/loading",
  RESULT: "/result",
  RESULT_DETAIL: "/result/detail",
  RESULT_COMPAT: "/result/compat",
  COMPLETE: "/complete",
  PENDING_DELETION: "/pending-deletion",
  TERMS: "/terms",
  PRIVACY: "/privacy",
  CHECKOUT: "/checkout",
  PAID: "/paid",
  PAYMENT_HISTORY: "/payment-history",
} as const;

/** 12시진 (자시 ~ 해시). DB값은 해당 시간대 대표 시각 HH:mm */
export const SIJIN_OPTIONS = [
  { label: "자시", hanja: "子時", timeRange: "23:00~01:00", value: "00:00" },
  { label: "축시", hanja: "丑時", timeRange: "01:00~03:00", value: "02:00" },
  { label: "인시", hanja: "寅時", timeRange: "03:00~05:00", value: "04:00" },
  { label: "묘시", hanja: "卯時", timeRange: "05:00~07:00", value: "06:00" },
  { label: "진시", hanja: "辰時", timeRange: "07:00~09:00", value: "08:00" },
  { label: "사시", hanja: "巳時", timeRange: "09:00~11:00", value: "10:00" },
  { label: "오시", hanja: "午時", timeRange: "11:00~13:00", value: "12:00" },
  { label: "미시", hanja: "未時", timeRange: "13:00~15:00", value: "14:00" },
  { label: "신시", hanja: "申時", timeRange: "15:00~17:00", value: "16:00" },
  { label: "유시", hanja: "酉時", timeRange: "17:00~19:00", value: "18:00" },
  { label: "술시", hanja: "戌時", timeRange: "19:00~21:00", value: "20:00" },
  { label: "해시", hanja: "亥時", timeRange: "21:00~23:00", value: "22:00" },
] as const;

/** 앱과 동일: 사주 기본(0~4) + 프로필(5~13) + 확인(14). 웹은 SMS(4) 생략 → 14단계 */
export const ONBOARDING_STEP_COUNT = 14;

/** 활동지역 옵션 (앱 step_location 기준 18개) */
export const LOCATION_OPTIONS = [
  "서울 강남", "서울 강북", "서울 강서", "서울 강동",
  "경기 남부", "경기 북부", "인천", "부산", "대구", "대전", "광주", "제주도",
  "경상도", "전라도", "충청도", "강원도", "국내 기타", "해외",
] as const;

/** 체형 (앱 BodyType) */
export const BODY_TYPE_OPTIONS = [
  { value: "slim", label: "마른" },
  { value: "average", label: "보통" },
  { value: "slightlyChubby", label: "살짝 통통" },
  { value: "chubby", label: "통통" },
] as const;

/** 종교 (앱 Religion) */
export const RELIGION_OPTIONS = [
  { value: "none", label: "무교" },
  { value: "christian", label: "기독교" },
  { value: "catholic", label: "천주교" },
  { value: "buddhist", label: "불교" },
  { value: "other", label: "기타" },
] as const;

/** 관심사 프리셋 12개 (앱 Step 12) — 다중 선택, 최대 10개 */
export const INTEREST_OPTIONS = [
  "여행", "음악", "영화", "운동", "독서", "요리",
  "사진", "게임", "반려동물", "카페", "맛집", "드라이브",
] as const;

export const INTEREST_MAX_SELECT = 10;

/** 궁합 등급 (앱 CompatibilityGrade 1:1 매핑)
 * ⚠️ 반드시 minScore 내림차순으로 유지할 것! Array.find()가 첫 매칭을 반환하므로
 * 순서가 바뀌면 등급 판정이 깨짐. */
export const COMPATIBILITY_GRADES = [
  { key: "destined", label: "천생연분", description: "하늘이 맺어준 인연이에요", minScore: 90 },
  { key: "excellent", label: "최고의 인연", description: "별이 겹치는 특별한 사이예요", minScore: 75 },
  { key: "good", label: "좋은 인연", description: "함께 성장할 수 있는 관계예요", minScore: 60 },
  { key: "average", label: "보통 인연", description: "알아갈수록 깊어지는 인연이에요", minScore: 40 },
  { key: "challenging", label: "도전적 인연", description: "서로 다르기에 새로운 시각을 배울 수 있어요", minScore: 0 },
] as const;

export type CompatibilityGradeKey = typeof COMPATIBILITY_GRADES[number]["key"];

export function getCompatibilityGrade(score: number) {
  return COMPATIBILITY_GRADES.find((g) => score >= g.minScore) ?? COMPATIBILITY_GRADES[COMPATIBILITY_GRADES.length - 1];
}

/** 유료 상품 정의 — 금액은 이 상수만이 권위 있는 소스 */
export const PRODUCTS = {
  paid_saju: {
    id: "paid_saju",
    name: "더 자세한 사주 보기",
    amount: 500,
    description: "13가지 영역으로 나누어 사주를 아주 자세히 풀어드려요.",
    shortDescription: "13가지 영역 심층 사주 분석",
  },
  paid_gwansang: {
    id: "paid_gwansang",
    name: "더 자세한 관상 보기",
    amount: 500,
    description: "13가지 영역으로 내 얼굴이 말해주는 것들을 깊이 있게 분석해요.",
    shortDescription: "13가지 영역 심층 관상 분석",
  },
} as const;

export type ProductId = keyof typeof PRODUCTS;

export function isValidProductId(id: string): id is ProductId {
  return id in PRODUCTS;
}
