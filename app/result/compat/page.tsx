"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { ROUTES } from "@/lib/constants";
import { getCharacterTypeFromElement } from "@/lib/result-tokens";
import { CompatibilityTab } from "@/components/result/compatibility-tab";

export default function CompatPage() {
  return (
    <Suspense>
      <CompatPageInner />
    </Suspense>
  );
}

function CompatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<{
    name: string | null;
    character_type: string | null;
    dominant_element: string | null;
    profile_images: string[] | null;
  } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [compatPartnerId, setCompatPartnerId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("name, character_type, dominant_element, profile_images")
          .eq("auth_id", user.id)
          .maybeSingle();
        if (!cancelled && profileRow) setProfile(profileRow);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/share-url");
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled && data.url) setShareUrl(data.url);
    })();
    return () => { cancelled = true; };
  }, []);

  // momo_compat_partner 읽기 + 클리어 (기존 /result에서 이전)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const partnerId = sessionStorage.getItem("momo_compat_partner")
      || document.cookie.match(/momo_compat_partner=([^;]+)/)?.[1]
      || null;
    if (partnerId) {
      setCompatPartnerId(partnerId);
      sessionStorage.removeItem("momo_compat_partner");
      document.cookie = "momo_compat_partner=;max-age=0;path=/";
    }
  }, [searchParams]);

  const nickname = profile?.name ?? "";
  const dominantEl = profile?.dominant_element ?? null;
  const effectiveCharacterType = profile?.character_type ?? getCharacterTypeFromElement(dominantEl) ?? "namuri";
  const myProfileImage = profile?.profile_images?.[0] ?? null;

  if (dataLoading) {
    return (
      <MobileContainer className="min-h-dvh bg-hanji flex flex-col items-center justify-center">
        <p className="text-sm text-ink-muted">불러오는 중...</p>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer className="h-dvh max-h-dvh bg-hanji text-ink flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-touch">
        <div className="flex items-center justify-between px-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(ROUTES.RESULT)}
            className="flex items-center gap-1 text-sm text-ink-muted py-2 px-1"
          >
            <svg width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            돌아가기
          </button>
        </div>
        <div className="px-5 pt-4 pb-8">
          <CompatibilityTab
            referralPartnerId={compatPartnerId}
            myName={nickname}
            myCharacterType={effectiveCharacterType}
            myDominantElement={dominantEl}
            myProfileImage={myProfileImage}
            shareUrl={shareUrl}
          />
        </div>
      </div>
      <CtaBar className="shrink-0">
        <Link href={ROUTES.RESULT} className="block">
          <Button size="lg" className="w-full">
            이상형 매칭 보러가기
          </Button>
        </Link>
      </CtaBar>
    </MobileContainer>
  );
}
