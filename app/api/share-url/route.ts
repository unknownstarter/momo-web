import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encodeShareToken } from "@/lib/share-token";

const SHORT_ID_LEN = 8;
const SHORT_ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const MAX_INSERT_ATTEMPTS = 3;
const PG_UNIQUE_VIOLATION = "23505";

function generateShortId(): string {
  const bytes = new Uint8Array(SHORT_ID_LEN);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  }
  return Array.from(bytes, (b) => SHORT_ID_CHARS[b % SHORT_ID_CHARS.length]).join("");
}

/**
 * 로그인된 유저의 공유 URL 반환.
 *
 * 정상 경로: share_links 테이블에서 profile 당 short_id 1개를 유지하고 `/s/{short_id}` 반환.
 * 폴백: DB 접근 자체가 불가한 극단적 상황에서만 암호화 토큰 기반 `/share/{token}` 반환.
 *
 * 레거시: 2026-04-08 이전에 share_links 테이블이 실제로는 존재하지 않아
 * 모든 호출이 폴백으로 빠지던 버그가 있었음. 테이블 생성 이후에는 폴백이 거의 트리거되지 않아야 함.
 */
export async function GET(request: Request) {
  const origin = request.headers.get("x-forwarded-host")
    ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("x-forwarded-host")}`
    : new URL(request.url).origin;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "no_profile" }, { status: 404 });
  }

  const admin = createAdminClient();

  // 1. 기존 short_id 확인
  const { data: existing, error: selectError } = await admin
    .from("share_links")
    .select("short_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (selectError) {
    console.error("[share-url] select failed", {
      code: selectError.code,
      message: selectError.message,
      profileId: profile.id,
    });
    return fallbackToEncryptedUrl(origin, profile.id);
  }

  if (existing?.short_id) {
    return NextResponse.json({ url: `${origin}/s/${existing.short_id}` });
  }

  // 2. 신규 생성 — 동시성(같은 profile 중복 insert) + 극희박 short_id 충돌 대비 재시도
  for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt++) {
    const shortId = generateShortId();
    const { error: insertError } = await admin.from("share_links").insert({
      short_id: shortId,
      profile_id: profile.id,
    });

    if (!insertError) {
      return NextResponse.json({ url: `${origin}/s/${shortId}` });
    }

    if (insertError.code === PG_UNIQUE_VIOLATION) {
      // profile_id 중복이면 동시 요청이 먼저 성공한 것 → 기존 값 재조회
      const { data: raced } = await admin
        .from("share_links")
        .select("short_id")
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (raced?.short_id) {
        return NextResponse.json({ url: `${origin}/s/${raced.short_id}` });
      }
      // 여기 도달하면 short_id PK 충돌 — 새 id로 재시도
      continue;
    }

    console.error("[share-url] insert failed", {
      code: insertError.code,
      message: insertError.message,
      attempt,
      profileId: profile.id,
    });
    break;
  }

  return fallbackToEncryptedUrl(origin, profile.id);
}

function fallbackToEncryptedUrl(origin: string, profileId: string) {
  console.warn("[share-url] falling back to encrypted token URL", { profileId });
  try {
    const token = encodeShareToken(profileId);
    return NextResponse.json({ url: `${origin}/share/${token}` });
  } catch (e) {
    console.error("[share-url] encodeShareToken failed", e);
    return NextResponse.json({ error: "config" }, { status: 500 });
  }
}
