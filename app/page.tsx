import { Suspense } from "react";
import { MobileContainer } from "@/components/ui/mobile-container";
import { CtaBar } from "@/components/ui/cta-bar";
import { LandingLoginSheet } from "@/components/landing-login-sheet";
import { LandingPreview } from "@/components/landing-preview";
import { TrackMainView } from "@/components/track-main-view";
import { DeletionNotice } from "@/components/deletion-notice";
import { createAdminClient } from "@/lib/supabase/admin";

async function getLandingStats(): Promise<{ count: number; blurHashes: string[] }> {
  try {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_saju_complete", true);

    const { data: hashRows } = await supabase
      .from("profiles")
      .select("blur_hash")
      .eq("is_saju_complete", true)
      .not("blur_hash", "is", null)
      .not("blur_hash", "eq", "")
      .limit(6);

    const blurHashes = (hashRows ?? [])
      .map((r) => r.blur_hash as string)
      .filter(Boolean);

    return { count: count ?? 0, blurHashes };
  } catch {
    return { count: 0, blurHashes: [] };
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const authError = params?.error;
  const { count: profileCount, blurHashes } = await getLandingStats();

  return (
    <>
      <TrackMainView />
      <Suspense>
        <DeletionNotice />
      </Suspense>
      <MobileContainer
        fillViewport={false}
        className="h-full min-h-0 flex flex-col bg-hanji w-full min-w-0 overflow-hidden"
      >
        <main className="flex-1 min-h-0 flex flex-col w-full min-w-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto flex flex-col w-full min-w-0 px-5 pt-8 pb-12">
            {/* 브랜드 */}
            <section className="w-full shrink-0" aria-label="브랜드">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-hanji-border bg-element-water-pastel shadow-low shrink-0 flex items-center justify-center">
                  <img
                    src="/images/characters/loading_spinner.gif"
                    alt=""
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[15px] font-bold text-ink tracking-tight">
                  momo
                </span>
              </div>
            </section>

            {/* 에러 */}
            {authError && (
              <div className="mt-3 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100">
                <p className="text-sm text-red-600">
                  {authError === "account_deleted"
                    ? "삭제된 계정이에요."
                    : "로그인에 실패했어요. 다시 시도해 주세요."}
                </p>
              </div>
            )}

            {/* 후킹 카피 */}
            <section className="mt-10 w-full shrink-0" aria-label="소개">
              <h1 className="text-[24px] font-bold text-ink leading-snug tracking-tight">
                내 얼굴에 숨은
                <br />
                동물상이 뭘까?
              </h1>
              <p className="mt-3 text-[15px] text-ink-muted leading-relaxed">
                사주와 관상이 알려주는 나의 연애 유형
              </p>
            </section>

            {/* 결과 미리보기 */}
            <section className="mt-8 w-full shrink-0" aria-label="미리보기">
              <LandingPreview blurHashes={blurHashes} profileCount={profileCount} />
            </section>

            {/* 제공 항목 */}
            <section className="mt-6 w-full shrink-0" aria-label="분석 항목">
              <div className="flex flex-wrap gap-2">
                {["사주 해석", "관상 분석", "궁합 매칭", "이상형 추천"].map(
                  (label) => (
                    <span
                      key={label}
                      className="px-3 py-1.5 rounded-full border border-hanji-border text-[12px] text-ink-muted bg-hanji"
                    >
                      {label}
                    </span>
                  )
                )}
              </div>
            </section>

            {/* 소셜 프루프 (블러해시 카드가 없을 때만) */}
            {profileCount > 0 && blurHashes.length === 0 && (
              <section className="mt-5 w-full shrink-0" aria-label="참여자">
                <p className="text-[13px] text-ink-tertiary">
                  지금까지{" "}
                  <span className="font-semibold text-ink-muted">
                    {profileCount.toLocaleString()}명
                  </span>
                  이 자신의 동물상을 확인했어요
                </p>
              </section>
            )}
          </div>

          {/* CTA */}
          <CtaBar className="shrink-0">
            <LandingLoginSheet />
          </CtaBar>
        </main>
      </MobileContainer>
    </>
  );
}
