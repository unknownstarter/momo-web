# Momo Web — 디자인 시스템 (Tailwind CSS 매핑)

> Flutter 앱의 디자인 토큰을 Tailwind CSS로 1:1 매핑한 레퍼런스.
> `tailwind.config.ts`에 이 값들을 그대로 반영한다.

---

## 1. 컬러 토큰

### 1.1 시맨틱 컬러 (라이트 모드 — 한지 톤)

| 토큰 | Hex | Tailwind 클래스 | 용도 |
|------|-----|----------------|------|
| `bgPrimary` | `#F7F3EE` | `bg-hanji` | 페이지 배경 |
| `bgSecondary` | `#F0EDE8` | `bg-hanji-secondary` | 섹션 배경 |
| `bgElevated` | `#FEFCF9` | `bg-hanji-elevated` | 카드, 모달 |
| `textPrimary` | `#2D2D2D` | `text-ink` | 본문 텍스트 |
| `textSecondary` | `#6B6B6B` | `text-ink-secondary` | 보조 텍스트 |
| `textTertiary` | `#A0A0A0` | `text-ink-tertiary` | 힌트, 플레이스홀더 |
| `borderDefault` | `#E8E4DF` | `border-hanji-border` | 기본 보더 |
| `borderFocus` | `#A8C8E8` | `border-brand` | 포커스 보더 |
| `fillBrand` | `#A8C8E8` | `bg-brand` | 브랜드 하이라이트 |
| `fillAccent` | `#F2D0D5` | `bg-accent` | 액센트 (핑크) |
| `fillDisabled` | `#E8E4DF` | `bg-disabled` | 비활성 상태 |

### 1.2 시맨틱 컬러 (다크 모드 — 먹색 톤)

| 토큰 | Hex | Tailwind 클래스 | 용도 |
|------|-----|----------------|------|
| `bgPrimary` | `#1D1E23` | `dark:bg-ink-bg` | 페이지 배경 |
| `bgSecondary` | `#2A2B32` | `dark:bg-ink-secondary` | 섹션 배경 |
| `bgElevated` | `#35363F` | `dark:bg-ink-elevated` | 카드, 모달 |
| `textPrimary` | `#E8E4DF` | `dark:text-hanji` | 본문 텍스트 |
| `textSecondary` | `#A09B94` | `dark:text-hanji-muted` | 보조 텍스트 |
| `borderDefault` | `#35363F` | `dark:border-ink-border` | 기본 보더 |

### 1.3 오행 팔레트

| 오행 | Main | Pastel | Tailwind |
|------|------|--------|----------|
| 木 (나무) | `#8FB89A` | `#D4E4D7` | `element-wood` / `element-wood-pastel` |
| 火 (불) | `#D4918E` | `#F0D4D2` | `element-fire` / `element-fire-pastel` |
| 土 (흙) | `#C8B68E` | `#E8DFC8` | `element-earth` / `element-earth-pastel` |
| 金 (쇠) | `#B8BCC0` | `#E0E2E4` | `element-metal` / `element-metal-pastel` |
| 水 (물) | `#89B0CB` | `#C8DBEA` | `element-water` / `element-water-pastel` |

### 1.4 궁합 점수 컬러

| 등급 | 범위 | Hex | Tailwind |
|------|------|-----|----------|
| 천생연분 | 90-100 | `#C27A88` | `compat-destined` |
| 좋은 궁합 | 75-89 | `#C49A7C` | `compat-excellent` |
| 괜찮은 궁합 | 60-74 | `#A8B0A0` | `compat-good` |
| 보통 | 40-59 | `#959EA2` | `compat-average` |

### 1.5 기타

| 용도 | Hex | 비고 |
|------|-----|------|
| CTA 버튼 | `#2D2D2D` | 온보딩 "다음" 버튼 |
| 건너뛰기 텍스트 | `#2D2D2D` 35% alpha | 연한 회색 |
| 인트로 골드 | `#B8A080` | 슬라이드 1 액센트 |
| 인트로 하늘 | `#89B0CB` | 슬라이드 2 액센트 |
| 인트로 핑크 | `#D4918E` | 슬라이드 3 액센트 |

---

## 2. 타이포그래피

### 폰트
- **Pretendard** (self-hosted via `next/font/local`)
- Fallback: `system-ui, -apple-system, sans-serif`

### 스케일

| 레벨 | Size | Weight | Line Height | Letter Spacing | 용도 |
|------|------|--------|-------------|----------------|------|
| `hero` | 48px | 700 | 1.1 | -1.5px | 점수 표시 |
| `display1` | 32px | 700 | 1.2 | -0.8px | 메인 헤딩 |
| `display2` | 24px | 600 | 1.25 | -0.4px | 섹션 타이틀 |
| `heading1` | 20px | 600 | 1.35 | -0.3px | 페이지 헤더 |
| `heading2` | 17px | 600 | 1.4 | -0.2px | 서브 헤더 |
| `heading3` | 15px | 600 | 1.4 | -0.1px | 카드 타이틀 |
| `body1` | 16px | 400 | 1.55 | 0 | 본문 |
| `body2` | 14px | 400 | 1.5 | 0 | 보조 본문 |
| `caption1` | 13px | 500 | 1.4 | 0 | 캡션 |
| `caption2` | 12px | 500 | 1.35 | 0 | 배지 |
| `overline` | 11px | 500 | 1.3 | 0.2px | 태그 |

---

## 3. 간격 (4px Grid)

| 토큰 | 값 | Tailwind |
|------|-----|----------|
| `space2` | 2px | `0.5` |
| `space4` | 4px | `1` |
| `space6` | 6px | `1.5` |
| `space8` | 8px | `2` |
| `space12` | 12px | `3` |
| `space16` | 16px | `4` |
| `space20` | 20px | `5` |
| `space24` | 24px | `6` |
| `space32` | 32px | `8` |
| `space40` | 40px | `10` |
| `space48` | 48px | `12` |
| `space64` | 64px | `16` |

**프리셋**
- 페이지 좌우 패딩: `px-5` (20px)
- 카드 내부 패딩: `p-4` (16px)
- 카드 간 간격: `gap-6` (24px) 또는 `gap-8` (32px)

---

## 4. 보더 라운딩

| 토큰 | 값 | Tailwind | 용도 |
|------|-----|----------|------|
| `radiusSm` | 8px | `rounded-lg` | 인풋, 작은 요소 |
| `radiusMd` | 12px | `rounded-xl` | 버튼, 카드 |
| `radiusLg` | 16px | `rounded-2xl` | 메인 카드, 서피스 |
| `radiusXl` | 20px | `rounded-[20px]` | 다이얼로그 |
| `radiusFull` | 999px | `rounded-full` | 칩, 배지, 원형 |

---

## 5. 그림자

### 라이트 모드
```css
/* elevationLow */
shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);

/* elevationMedium */
shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06);

/* elevationHigh */
shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.08);
```

### 다크 모드
```css
/* 그림자 없음 — 보더로 대체 */
border: 1px solid #35363F;

/* 미스틱 글로우 (사주/관상 결과용) */
shadow-mystic: 0 0 20px 2px rgba(200, 182, 142, 0.15);
```

---

## 6. 애니메이션

| 토큰 | Duration | Curve | 용도 |
|------|----------|-------|------|
| `fast` | 100ms | easeOut | 상태 변화 (opacity, color) |
| `normal` | 200ms | easeOut | 기본 전환 |
| `slow` | 300ms | easeInOut | 페이지 전환 |
| `reveal` | 1800ms | easeOutCubic | 사주/관상 결과 리빌 |

### Framer Motion 프리셋
```tsx
// 페이드인
const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }

// 슬라이드업
const slideUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } }

// 스코어 리빌
const scoreReveal = { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 1.8, ease: [0.33, 0.66, 0.66, 1] } }
```

---

## 7. 컴포넌트 매핑 (Flutter → React)

| Flutter 위젯 | React 컴포넌트 | 비고 |
|---|---|---|
| `SajuButton` | `<Button variant size color>` | 5 variant, 6 size |
| `SajuCard` | `<Card variant>` | 5 variant |
| `SajuInput` | `<Input>` | 포커스 보더 색상 |
| `SajuChip` | `<Chip>` | 관심사 태그 |
| `SajuCharacterBubble` | `<CharacterBubble>` | 캐릭터 + 말풍선 |
| `CompatibilityGauge` | `<CompatibilityGauge>` | SVG 원형 게이지 |
| `MomoLoading` | `<Loading>` | 스피너 |
| `SajuOtpInput` | 불필요 | SMS 인증 없음 (웹) |

### Button Sizes
```
xs: h-8 text-xs px-3
sm: h-10 text-[13px] px-4
md: h-11 text-sm px-5
lg: h-12 text-[15px] px-6
xl: h-[52px] text-base px-8    ← 기본 CTA
```

---

## 8. tailwind.config.ts 예시

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.tsx', './components/**/*.tsx'],
  theme: {
    extend: {
      fontFamily: {
        pretendard: ['Pretendard', 'system-ui', 'sans-serif'],
      },
      colors: {
        hanji: {
          DEFAULT: '#F7F3EE',
          secondary: '#F0EDE8',
          elevated: '#FEFCF9',
          border: '#E8E4DF',
        },
        ink: {
          DEFAULT: '#2D2D2D',
          bg: '#1D1E23',
          secondary: '#2A2B32',
          elevated: '#35363F',
          border: '#35363F',
          muted: '#6B6B6B',
          tertiary: '#A0A0A0',
        },
        brand: { DEFAULT: '#A8C8E8' },
        accent: { DEFAULT: '#F2D0D5' },
        element: {
          wood: '#8FB89A',
          fire: '#D4918E',
          earth: '#C8B68E',
          metal: '#B8BCC0',
          water: '#89B0CB',
          'wood-pastel': '#D4E4D7',
          'fire-pastel': '#F0D4D2',
          'earth-pastel': '#E8DFC8',
          'metal-pastel': '#E0E2E4',
          'water-pastel': '#C8DBEA',
        },
        compat: {
          destined: '#C27A88',
          excellent: '#C49A7C',
          good: '#A8B0A0',
          average: '#959EA2',
        },
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
        'dialog': '20px',
      },
      boxShadow: {
        'low': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'medium': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'high': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'mystic': '0 0 20px 2px rgba(200, 182, 142, 0.15)',
      },
      maxWidth: {
        'mobile': '430px',
      },
    },
  },
}
export default config
```
