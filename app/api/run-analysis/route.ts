import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAnalysis } from "@/lib/analysis";

/**
 * 로그인된 유저의 프로필로 사주·관상 분석 실행 (Edge Function 3종 + DB 저장).
 * result/loading 페이지에서 호출.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { data: { session } } = await supabase.auth.getSession();
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

  // user_id 기반으로 삭제: step 4 백그라운드 분석이 먼저 완료된 후
  // step 13에서 saju_profile_id를 null로 리셋하면 orphaned row가 남는 문제 방지
  await supabase.from("saju_profiles").delete().eq("user_id", profile.id);
  await supabase.from("gwansang_profiles").delete().eq("user_id", profile.id);

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
