import { ImageResponse } from "next/og";

export const runtime = "edge";

/** 오행별 색상 (result-tokens.ts와 동일) */
const ELEMENT_COLORS: Record<string, { main: string; pastel: string }> = {
  wood: { main: "#8FB89A", pastel: "#D4E4D7" },
  fire: { main: "#D4918E", pastel: "#F0D4D2" },
  earth: { main: "#C8B68E", pastel: "#E8DFC8" },
  metal: { main: "#B8BCC0", pastel: "#E0E2E4" },
  water: { main: "#89B0CB", pastel: "#C8DBEA" },
};

function normalizeElement(el: string): string {
  const s = el.toLowerCase();
  if (s === "목" || s === "wood") return "wood";
  if (s === "화" || s === "fire") return "fire";
  if (s === "토" || s === "earth") return "earth";
  if (s === "금" || s === "metal") return "metal";
  if (s === "수" || s === "water") return "water";
  return "metal";
}

// Pretendard Bold — lazy singleton, 실패 시 재시도 허용
const g = globalThis as typeof globalThis & {
  _pretendardFont?: Promise<ArrayBuffer>;
  _notosansFont?: Promise<ArrayBuffer>;
};

function getFontData(): Promise<ArrayBuffer> {
  if (!g._pretendardFont) {
    g._pretendardFont = fetch(
      "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf",
    )
      .then((res) => {
        if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
        return res.arrayBuffer();
      })
      .catch((err) => {
        g._pretendardFont = undefined;
        throw err;
      });
  }
  return g._pretendardFont;
}

/** Satori는 최소 1개 폰트가 필수 — Pretendard 실패 시 Noto Sans KR로 폴백 */
function getFallbackFontData(): Promise<ArrayBuffer> {
  if (!g._notosansFont) {
    g._notosansFont = fetch(
      "https://fonts.gstatic.com/s/notosanskr/v39/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzg01eLQ.ttf",
    )
      .then((res) => {
        if (!res.ok) throw new Error(`Fallback font fetch failed: ${res.status}`);
        return res.arrayBuffer();
      })
      .catch((err) => {
        g._notosansFont = undefined;
        throw err;
      });
  }
  return g._notosansFont;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? "친구";
  const typeLabel = searchParams.get("type") ?? "매력적인";
  const emoji = searchParams.get("emoji") ?? "✨";
  const element = normalizeElement(searchParams.get("element") ?? "metal");
  const character = searchParams.get("character") ?? "namuri";

  const colors = ELEMENT_COLORS[element] ?? ELEMENT_COLORS.metal;
  const origin = new URL(request.url).origin;
  const characterUrl = `${origin}/images/characters/${character}/default.png`;

  let font: ArrayBuffer;
  let fontName = "Pretendard";
  try {
    font = await getFontData();
  } catch {
    // Pretendard 실패 시 Noto Sans KR 폴백 — Satori는 최소 1개 폰트 필수
    try {
      font = await getFallbackFontData();
      fontName = "Noto Sans KR";
    } catch {
      // 모든 폰트 실패 시에도 빈 배열이 아닌 에러 응답 반환
      return new Response("Font loading failed", { status: 500 });
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F7F3EE",
          fontFamily: `${fontName}, sans-serif`,
        }}
      >
        {/* 배경 그라데이션 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(ellipse at 50% 30%, ${colors.pastel}99 0%, transparent 70%)`,
            display: "flex",
          }}
        />

        {/* 메인 콘텐츠 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative" as const,
          }}
        >
          {/* 캐릭터 원형 아바타 */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              border: `4px solid ${colors.main}66`,
              background: `radial-gradient(circle, ${colors.pastel} 0%, ${colors.pastel}4D 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={characterUrl}
              alt=""
              width={100}
              height={100}
              style={{ objectFit: "contain" }}
            />
          </div>

          {/* 이름 */}
          <p
            style={{
              marginTop: 24,
              fontSize: 28,
              color: "#2D2D2D",
              fontWeight: 700,
            }}
          >
            {name}님은 연애할 때
          </p>

          {/* 유형 라벨 — 크기 키워 카카오 썸네일에서도 가독 */}
          <p
            style={{
              marginTop: 8,
              fontSize: 60,
              fontWeight: 700,
              color: colors.main,
              lineHeight: 1.2,
            }}
          >
            {emoji} {typeLabel}
          </p>

          {/* CTA 유도 뱃지 */}
          <div
            style={{
              marginTop: 28,
              padding: "12px 32px",
              borderRadius: 999,
              backgroundColor: `${colors.main}44`,
              display: "flex",
              alignItems: "center",
            }}
          >
            <p style={{ fontSize: 20, color: "#2D2D2D", fontWeight: 700 }}>
              나도 내 연애 유형 알아보기 →
            </p>
          </div>
        </div>

        {/* 브랜드 레이블 */}
        <p
          style={{
            position: "absolute",
            bottom: 24,
            fontSize: 16,
            color: "#A0A0A0",
            fontWeight: 700,
          }}
        >
          momo · 사주 소개팅
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: fontName,
          data: font,
          style: "normal" as const,
          weight: 700 as const,
        },
      ],
    },
  );
}
