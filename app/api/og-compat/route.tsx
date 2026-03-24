import { ImageResponse } from "next/og";

export const runtime = "edge";

/** 오행별 색상 (기존 /api/og와 동일) */
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
        if (!res.ok)
          throw new Error(`Fallback font fetch failed: ${res.status}`);
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
  const score = Math.min(
    100,
    Math.max(0, parseInt(searchParams.get("score") ?? "75", 10) || 75),
  );
  const grade = searchParams.get("grade") ?? "좋은 인연";
  const element = normalizeElement(searchParams.get("element") ?? "metal");
  const VALID_CHARACTERS = ["namuri", "bulkkori", "heuksuni", "soedongi", "mulgyeori"];
  const rawCharacter = searchParams.get("character") ?? "namuri";
  const character = VALID_CHARACTERS.includes(rawCharacter) ? rawCharacter : "namuri";

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
      // 모든 폰트 실패 시 에러 응답 반환
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
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${colors.pastel} 0%, #F7F3EE 100%)`,
          fontFamily: `${fontName}, sans-serif`,
        }}
      >
        {/* 왼쪽: 캐릭터 원형 */}
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: "50%",
            border: `4px solid ${colors.main}`,
            backgroundColor: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={characterUrl}
            alt=""
            width={120}
            height={120}
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* 오른쪽: 텍스트 세로 배열 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 48,
          }}
        >
          {/* 부제: "{name}님과의 사주 궁합" */}
          <p
            style={{
              fontSize: 28,
              color: "#6B6B6B",
              fontWeight: 700,
              margin: 0,
            }}
          >
            {name}님과의 사주 궁합
          </p>

          {/* 점수 */}
          <p
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: colors.main,
              margin: 0,
              marginTop: 8,
              lineHeight: 1.1,
            }}
          >
            {score}점
          </p>

          {/* 등급 */}
          <p
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: colors.main,
              margin: 0,
              marginTop: 8,
            }}
          >
            {grade}
          </p>

          {/* 브랜드 */}
          <p
            style={{
              fontSize: 20,
              color: "#999999",
              fontWeight: 700,
              margin: 0,
              marginTop: 24,
            }}
          >
            모모 사주
          </p>
        </div>
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
