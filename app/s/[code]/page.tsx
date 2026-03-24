import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { ShareTeaserView } from "@/components/share-teaser-view";
import { ShareCompatibilityPrompt } from "@/components/share-compatibility-prompt";
import { resolveShortCode, fetchShareData } from "@/lib/share-data";
import { classifyRomanceType } from "@/lib/romance-types";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ code: string }>;
}

/** generateMetadata + page 간 DB 쿼리 중복 방지 (React cache) */
const getShareDataByCode = cache(async (code: string) => {
  const profileId = await resolveShortCode(code);
  if (!profileId) return null;
  return fetchShareData(profileId);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const data = await getShareDataByCode(code);
  if (!data) return {};

  const name = data.profile.name ?? "친구";
  const romanceType = classifyRomanceType({
    dominantElement:
      data.profile.dominant_element ??
      (data.sajuProfile?.dominant_element as string | null),
    personalityTraits: data.sajuProfile?.personality_traits as
      | string[]
      | null,
    romanceKeyPoints: data.sajuProfile?.romance_key_points as
      | string[]
      | null,
    romanceStyle: data.sajuProfile?.romance_style as string | null,
  });

  const title = `${name}님은 연애할 때 ${romanceType.label}이래요 ${romanceType.emoji}`;
  const description = `${romanceType.subtitle} — 나도 내 연애 유형 알아보기`;

  const ogImageUrl = `/api/og?name=${encodeURIComponent(name)}&type=${encodeURIComponent(romanceType.label)}&emoji=${encodeURIComponent(romanceType.emoji)}&element=${encodeURIComponent(data.profile.dominant_element ?? "metal")}&character=${encodeURIComponent(data.profile.character_type ?? "namuri")}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [ogImageUrl], type: "website" },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ShortSharePage({ params }: Props) {
  const { code } = await params;
  const data = await getShareDataByCode(code);

  if (!data) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col px-5">
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-ink-muted text-sm">잘못된 링크예요</p>
          <p className="mt-2 text-ink text-sm">
            링크가 만료되었거나 올바르지 않아요.
          </p>
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

  // 뷰어 상태 확인
  let viewerStatus: "has_result" | "logged_in" | "anonymous" = "anonymous";
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: viewerProfile } = await supabase
        .from("profiles")
        .select("is_saju_complete")
        .eq("auth_id", user.id)
        .maybeSingle();
      viewerStatus = viewerProfile?.is_saju_complete ? "has_result" : "logged_in";
    }
  } catch {
    // 인증 확인 실패 시 anonymous로 폴백
  }

  return (
    <>
      <ShareTeaserView
        profileName={data.profile.name ?? "친구"}
        dominantElement={data.profile.dominant_element}
        characterType={data.profile.character_type}
        personalityTraits={
          data.sajuProfile?.personality_traits as string[] | null
        }
        romanceStyle={data.sajuProfile?.romance_style as string | null}
        romanceKeyPoints={
          data.sajuProfile?.romance_key_points as string[] | null
        }
        charmKeywords={
          data.gwansangProfile?.charm_keywords as string[] | null
        }
        animalTypeKorean={
          data.gwansangProfile?.animal_type_korean as string | null
        }
        animalModifier={
          data.gwansangProfile?.animal_modifier as string | null
        }
        idealMatchSaju={
          data.sajuProfile?.ideal_match as
            | { description?: string; traits?: string[] }
            | null
        }
        idealMatchAnimalKorean={
          data.gwansangProfile?.ideal_match_animal_korean as string | null
        }
        idealMatchTraits={
          data.gwansangProfile?.ideal_match_traits as string[] | null
        }
        idealMatchDescription={
          data.gwansangProfile?.ideal_match_description as string | null
        }
        detailHref={`/s/${code}/detail`}
      />
      <ShareCompatibilityPrompt
        sharedProfileId={data.profile.id}
        sharedUserName={data.profile.name ?? "친구"}
        sharedDominantElement={data.profile.dominant_element}
        sharedCharacterType={data.profile.character_type}
        viewerStatus={viewerStatus}
      />
    </>
  );
}
