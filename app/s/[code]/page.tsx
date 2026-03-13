import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { createAdminClient } from "@/lib/supabase/admin";
import { ShareResultView } from "@/components/share-result-view";

interface ShortSharePageProps {
  params: Promise<{ code: string }>;
}

/**
 * 짧은 공유 링크 /s/[code]. share_links 테이블에서 profile_id 조회 후
 * admin으로 프로필 + 사주·관상 결과 조회해 전달 (RLS 우회).
 */
export default async function ShortSharePage({ params }: ShortSharePageProps) {
  const { code } = await params;

  const supabase = createAdminClient();
  const { data: link, error: linkError } = await supabase
    .from("share_links")
    .select("profile_id")
    .eq("short_id", code)
    .maybeSingle();

  if (linkError || !link?.profile_id) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col px-5">
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-ink-muted text-sm">잘못된 링크예요</p>
          <p className="mt-2 text-ink text-sm">링크가 만료되었거나 올바르지 않아요.</p>
        </div>
        <CtaBar>
          <Link href="/" className="block w-full">
            <Button size="lg" className="w-full">
              나도 사주 보러 가기
            </Button>
          </Link>
        </CtaBar>
      </MobileContainer>
    );
  }

  const profileId = link.profile_id as string;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, character_type, dominant_element, saju_profile_id, gwansang_profile_id")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError || !profile) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col px-5">
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-ink-muted text-sm">결과를 찾을 수 없어요</p>
          <p className="mt-2 text-ink text-sm">링크가 만료되었거나 잘못되었을 수 있어요.</p>
        </div>
        <CtaBar>
          <Link href="/" className="block w-full">
            <Button size="lg" className="w-full">
              나도 사주 보러 가기
            </Button>
          </Link>
        </CtaBar>
      </MobileContainer>
    );
  }

  // 공유 뷰에 필요한 컬럼만 조회 (user_id, photo_urls 등 민감 필드 노출 방지)
  const SAJU_SHARE_COLS = "year_pillar,month_pillar,day_pillar,hour_pillar,five_elements,dominant_element,personality_traits,ai_interpretation,yearly_fortune,period_fortunes,romance_style,romance_key_points,ideal_match";
  const GWANSANG_SHARE_COLS = "animal_type_korean,animal_modifier,headline,charm_keywords,samjeong,ogwan,personality_summary,romance_summary,romance_key_points,traits,ideal_match_animal_korean,ideal_match_traits,ideal_match_description";

  let sajuProfile: Record<string, unknown> | null = null;
  let gwansangProfile: Record<string, unknown> | null = null;

  if (profile.saju_profile_id) {
    const { data } = await supabase
      .from("saju_profiles")
      .select(SAJU_SHARE_COLS)
      .eq("id", profile.saju_profile_id)
      .maybeSingle();
    sajuProfile = data;
  }
  if (profile.gwansang_profile_id) {
    const { data } = await supabase
      .from("gwansang_profiles")
      .select(GWANSANG_SHARE_COLS)
      .eq("id", profile.gwansang_profile_id)
      .maybeSingle();
    gwansangProfile = data;
  }

  return (
    <ShareResultView
      profileName={profile.name ?? "친구"}
      profile={{ character_type: profile.character_type, dominant_element: profile.dominant_element }}
      sajuProfile={sajuProfile}
      gwansangProfile={gwansangProfile}
    />
  );
}
