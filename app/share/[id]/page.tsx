import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";

interface SharePageProps {
  params: Promise<{ id: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;

  return (
    <MobileContainer className="min-h-dvh bg-hanji flex flex-col items-center justify-center px-5 text-center">
      <p className="text-ink-muted text-sm">공유된 결과 (ID: {id})</p>
      <p className="mt-2 text-ink text-sm">
        (연동 후 프로필·사주/관상 요약이 표시됩니다)
      </p>
      <Link href="/" className="mt-8 block w-full">
        <Button size="lg" className="w-full">
          나도 사주 보러 가기
        </Button>
      </Link>
    </MobileContainer>
  );
}
