import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeShareToken } from "@/lib/share-token";
import { ShareResultView } from "@/components/share-result-view";

interface SharePageProps {
  params: Promise<{ id: string }>;
}

/**
 * 공유 링크 /share/[token]. token은 프로필 ID가 아닌 암호화된 값(개인정보 노출 방지).
 * 서버에서 복호화 후 해당 프로필만 조회.
 */
export default async function SharePage({ params }: SharePageProps) {
  const { id: token } = await params;
  const profileId = decodeShareToken(token);

  if (!profileId) {
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

  const supabase = createAdminClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("id", profileId)
    .maybeSingle();

  if (error || !profile) {
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

  return <ShareResultView profileName={profile.name ?? "친구"} />;
}
