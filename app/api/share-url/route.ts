import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encodeShareToken } from "@/lib/share-token";

/**
 * 로그인된 유저의 공유 URL 반환. 프로필 ID는 암호화된 토큰으로만 노출.
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
    const token = encodeShareToken(profile.id);
    return NextResponse.json({ url: `${origin}/share/${token}` });
  } catch (e) {
    return NextResponse.json({ error: "config" }, { status: 500 });
  }
}
