import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encodeShareToken } from "@/lib/share-token";

const SHORT_ID_LEN = 8;
const SHORT_ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateShortId(): string {
  const bytes = new Uint8Array(SHORT_ID_LEN);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  }
  return Array.from(bytes, (b) => SHORT_ID_CHARS[b % SHORT_ID_CHARS.length]).join("");
}

/**
 * 로그인된 유저의 공유 URL 반환.
 * share_links 테이블이 있으면 짧은 URL(/s/{code}) 반환, 없으면 암호화 토큰 URL(/share/{token}) 반환.
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

  try {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("share_links")
      .select("short_id")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (existing?.short_id) {
      return NextResponse.json({ url: `${origin}/s/${existing.short_id}` });
    }

    const shortId = generateShortId();
    const { error } = await admin.from("share_links").insert({
      short_id: shortId,
      profile_id: profile.id,
    });

    if (!error) {
      return NextResponse.json({ url: `${origin}/s/${shortId}` });
    }
  } catch {
    // share_links 테이블 없거나 오류 시 긴 URL로 폴백
  }

  try {
    const token = encodeShareToken(profile.id);
    return NextResponse.json({ url: `${origin}/share/${token}` });
  } catch (e) {
    return NextResponse.json({ error: "config" }, { status: 500 });
  }
}
