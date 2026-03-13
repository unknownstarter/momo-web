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
  COMPLETE: "/complete",
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
