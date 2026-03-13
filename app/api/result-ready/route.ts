import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** 로딩 페이지에서 결과 준비 여부 폴링용. is_saju_complete 이면 ready */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ready: false }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_saju_complete")
    .eq("auth_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    ready: Boolean(profile?.is_saju_complete),
  });
}
