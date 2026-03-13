import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAnalysis } from "@/lib/analysis";

/**
 * 로그인된 유저의 프로필로 사주·관상 분석 실행 (Edge Function 3종 + DB 저장).
 * result/loading 페이지에서 호출.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, gender, birth_date, birth_time, profile_images, is_saju_complete, saju_profile_id, gwansang_profile_id")
    .eq("auth_id", session.user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ ok: false, error: "no_profile" }, { status: 404 });
  }

  const p = profile as {
    is_saju_complete?: boolean;
    saju_profile_id?: string | null;
    gwansang_profile_id?: string | null;
  };
  if (p.is_saju_complete) {
    return NextResponse.json({ ok: true, alreadyDone: true });
  }

  if (p.saju_profile_id) {
    await supabase.from("saju_profiles").delete().eq("id", p.saju_profile_id);
  }
  if (p.gwansang_profile_id) {
    await supabase.from("gwansang_profiles").delete().eq("id", p.gwansang_profile_id);
  }

  const result = await runAnalysis(
    {
      id: profile.id,
      name: profile.name ?? "",
      gender: profile.gender ?? "male",
      birth_date: profile.birth_date,
      birth_time: profile.birth_time,
      profile_images: profile.profile_images,
    },
    session.access_token
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
