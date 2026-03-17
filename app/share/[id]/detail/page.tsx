import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { decodeShareToken } from "@/lib/share-token";
import { ShareResultView } from "@/components/share-result-view";
import { fetchShareData } from "@/lib/share-data";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShareDetailPage({ params }: Props) {
  const { id: token } = await params;
  const profileId = decodeShareToken(token);

  if (!profileId) {
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

  const data = await fetchShareData(profileId);

  if (!data) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col px-5">
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-ink-muted text-sm">결과를 찾을 수 없어요</p>
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

  return (
    <ShareResultView
      profileName={data.profile.name ?? "친구"}
      profile={{
        character_type: data.profile.character_type,
        dominant_element: data.profile.dominant_element,
      }}
      sajuProfile={data.sajuProfile}
      gwansangProfile={data.gwansangProfile}
    />
  );
}
