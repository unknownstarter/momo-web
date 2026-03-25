"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CharacterBubble } from "@/components/onboarding/character-bubble";
import { ProgressBar } from "@/components/onboarding/progress-bar";
import { BirthDatePicker } from "@/components/onboarding/birth-date-picker";
import { CtaBar } from "@/components/ui/cta-bar";
import {
  ROUTES,
  SIJIN_OPTIONS,
  ONBOARDING_STEP_COUNT,
  LOCATION_OPTIONS,
  BODY_TYPE_OPTIONS,
  RELIGION_OPTIONS,
  INTEREST_OPTIONS,
  INTEREST_MAX_SELECT,
} from "@/lib/constants";
import { trackViewNickname, trackClickNextInNickname } from "@/lib/analytics";

export interface OnboardingFormData {
  name: string;
  gender: "male" | "female" | null;
  birthDate: string;
  birthTime: string | null;
  photoPreview: string | null;
  /** 업로드용 원본 파일 (Storage 업로드 시 사용) */
  photoFile: File | null;
  height: string;
  occupation: string;
  location: string | null;
  bodyType: string | null;
  religion: string | null;
  bio: string;
  interests: string[];
  idealType: string;
}

const initialForm: OnboardingFormData = {
  name: "",
  gender: null,
  birthDate: "",
  birthTime: null,
  photoPreview: null,
  photoFile: null,
  height: "",
  occupation: "",
  location: null,
  bodyType: null,
  religion: null,
  bio: "",
  interests: [],
  idealType: "",
};

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${y}년 ${m}월 ${d}일`;
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingFormData>(initialForm);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const stepInitialized = useRef(false);

  const goNext = useCallback(() => {
    if (step === 0) trackClickNextInNickname();
    if (step < ONBOARDING_STEP_COUNT - 1) setStep((s) => s + 1);
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const canProceedStep0 = form.name.trim().length >= 2 && form.name.trim().length <= 10;
  const canProceedStep2 = form.birthDate.length > 0;
  const canProceedStep4 = !!form.photoPreview;
  const canProceedStep5 = /^\d{2,3}$/.test(form.height.trim()) && Number(form.height) >= 100 && Number(form.height) <= 250;
  const canProceedStep6 = form.occupation.trim().length >= 1;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => {
      if (f.photoPreview) URL.revokeObjectURL(f.photoPreview);
      return { ...f, photoPreview: URL.createObjectURL(file), photoFile: file };
    });
  };

  useEffect(() => {
    return () => {
      if (form.photoPreview) URL.revokeObjectURL(form.photoPreview);
    };
  }, [form.photoPreview]);

  useEffect(() => {
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(ROUTES.HOME);
        return;
      }
      if (stepInitialized.current) return;
      stepInitialized.current = true;

      const stepParam = searchParams.get("step");
      let targetStep = stepParam !== null ? parseInt(stepParam, 10) : NaN;
      if (Number.isNaN(targetStep) || targetStep < 0 || targetStep >= ONBOARDING_STEP_COUNT) {
        const res = await fetch("/api/onboarding-step", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          targetStep = data.step === "result" ? 0 : Number(data.step);
          if (Number.isNaN(targetStep) || targetStep < 0) targetStep = 0;
        } else {
          targetStep = 0;
        }
      }

      if (targetStep > 0) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("name, gender, birth_date, birth_time, profile_images, height, occupation, location, body_type, religion, bio, interests, ideal_type")
          .eq("auth_id", user.id)
          .maybeSingle();
        if (profileRow) {
          const birthTime = profileRow.birth_time
            ? String(profileRow.birth_time).replace(/:00$/, "") ?? null
            : null;
          setForm({
            name: profileRow.name ?? "",
            gender: (profileRow.gender as "male" | "female") ?? null,
            birthDate: profileRow.birth_date ?? "",
            birthTime,
            photoPreview: Array.isArray(profileRow.profile_images) && profileRow.profile_images[0]
              ? profileRow.profile_images[0]
              : null,
            photoFile: null,
            height: profileRow.height != null ? String(profileRow.height) : "",
            occupation: profileRow.occupation ?? "",
            location: profileRow.location ?? null,
            bodyType: profileRow.body_type ?? null,
            religion: profileRow.religion ?? null,
            bio: profileRow.bio ?? "",
            interests: Array.isArray(profileRow.interests) ? profileRow.interests : [],
            idealType: profileRow.ideal_type ?? "",
          });
        }
      }
      setStep(targetStep);
    })();
  }, [router, searchParams]);

  useEffect(() => {
    if (step === 0) trackViewNickname();
  }, [step]);

  /* Step 4: 사진 저장 + 분석 백그라운드 호출 */
  const handleStep4Submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let photoUrl: string | null = null;
        if (form.photoFile) {
          const path = `${user.id}/${Date.now()}.jpg`;
          const { error: upErr } = await supabase.storage
            .from("profile-images")
            .upload(path, form.photoFile, { contentType: form.photoFile.type || "image/jpeg", upsert: true });
          if (upErr) {
            setSubmitError("사진 업로드에 실패했어요. 다시 시도해 주세요.");
            setSubmitting(false);
            return;
          }
          const { data: { publicUrl } } = supabase.storage.from("profile-images").getPublicUrl(path);
          photoUrl = publicUrl;
        }
        const birthTime = form.birthTime ? `${form.birthTime}:00` : null;
        const { data: existing } = await supabase.from("profiles").select("id").eq("auth_id", user.id).maybeSingle();
        const payload = {
          name: form.name.trim(),
          gender: form.gender,
          birth_date: form.birthDate,
          birth_time: birthTime,
          ...(photoUrl ? { profile_images: [photoUrl] } : {}),
          last_active_at: new Date().toISOString(),
        };
        if (existing) {
          await supabase.from("profiles").update(payload).eq("auth_id", user.id);
        } else {
          await supabase.from("profiles").insert({
            auth_id: user.id,
            ...payload,
            profile_images: photoUrl ? [photoUrl] : [],
            is_saju_complete: false,
            is_gwansang_complete: false,
            is_profile_complete: false,
          });
        }
        // 사주·관상 분석을 미리 시작 (이름/생년월일/생시/사진 확정됨)
        // upsert(onConflict: "user_id")로 동시 호출 안전
        fetch("/api/run-analysis", { method: "POST" }).catch(() => {});
      }
    } catch {
      setSubmitError("저장에 실패했어요. 확인 단계에서 다시 시도해 주세요.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    goNext();
  };

  /* Step 13: 최종 저장 + 분석 시작 */
  const handleStep13Submit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(ROUTES.HOME);
        return;
      }
      let photoUrl: string | null = null;
      if (form.photoFile) {
        const path = `${user.id}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("profile-images")
          .upload(path, form.photoFile, { contentType: form.photoFile.type || "image/jpeg", upsert: true });
        if (upErr) {
          setSubmitError("사진 업로드에 실패했어요. 다시 시도해 주세요.");
          setSubmitting(false);
          return;
        }
        const { data: { publicUrl } } = supabase.storage.from("profile-images").getPublicUrl(path);
        photoUrl = publicUrl;
      }
      const birthTime = form.birthTime ? `${form.birthTime}:00` : null;
      const { data: existing } = await supabase.from("profiles").select("id").eq("auth_id", user.id).maybeSingle();
      const updatePayload = {
        name: form.name.trim(),
        gender: form.gender,
        birth_date: form.birthDate,
        birth_time: birthTime,
        ...(photoUrl ? { profile_images: [photoUrl] } : {}),
        height: form.height ? parseInt(form.height, 10) : null,
        occupation: form.occupation.trim() || null,
        location: form.location,
        body_type: form.bodyType,
        religion: form.religion,
        bio: form.bio.trim() || null,
        interests: form.interests.length ? form.interests : [],
        ideal_type: form.idealType.trim() || null,
        last_active_at: new Date().toISOString(),
        is_profile_complete: true,
        // ⚠️ saju_profile_id를 null로 리셋하지 않음.
        // step 4의 fire-and-forget 분석이 이미 완료됐을 수 있고,
        // step 5~12는 분석 입력(name/gender/birth/photo)을 변경하지 않으므로
        // 재분석이 불필요. /result/loading에서 is_saju_complete 체크로 중복 방지됨.
      };
      if (existing) {
        const { error: upErr } = await supabase.from("profiles").update(updatePayload).eq("auth_id", user.id);
        if (upErr) {
          setSubmitError("저장에 실패했어요. 다시 시도해 주세요.");
          setSubmitting(false);
          return;
        }
      } else {
        const { error: inErr } = await supabase.from("profiles").insert({
          auth_id: user.id,
          ...updatePayload,
          profile_images: photoUrl ? [photoUrl] : [],
          is_profile_complete: false,
        });
        if (inErr) {
          setSubmitError("저장에 실패했어요. 다시 시도해 주세요.");
          setSubmitting(false);
          return;
        }
      }
      if (typeof window !== "undefined") sessionStorage.setItem("momo_display_name", form.name.trim());
      router.push(ROUTES.RESULT_LOADING);
    } catch {
      setSubmitError("오류가 났어요. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileContainer className="h-dvh max-h-dvh flex flex-col bg-hanji overflow-hidden">
      {/* 뒤로가기: 맨 위, 터치 영역 넉넉하게 */}
      <div className="shrink-0 px-5 pt-4 pb-2 flex items-center justify-between">
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center justify-center min-h-[48px] min-w-[48px] -ml-2 text-ink hover:opacity-80 active:opacity-70"
            aria-label="뒤로 가기"
          >
            <span className="text-2xl font-medium leading-none" aria-hidden>←</span>
          </button>
        ) : (
          <span className="min-w-[48px]" aria-hidden />
        )}
      </div>
      <div className="shrink-0 px-5 pb-4">
        <ProgressBar currentStep={step} />
      </div>

      {/* 콘텐츠 스크롤 영역 — CTA는 이 바깥에서 고정 */}
      <main className="flex-1 min-h-0 px-5 pt-6 pb-8 overflow-y-auto overflow-x-hidden scroll-touch">
        {/* Step 0: 이름 */}
        {step === 0 && (
          <>
            <CharacterBubble
              character="mulgyeori"
              message="반가워요! 이름이 뭐예요?"
            />
            <div className="mt-8">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="이름을 입력해 주세요"
                className="w-full h-12 px-4 rounded-lg border border-hanji-border bg-hanji-elevated text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                maxLength={10}
                autoFocus
                aria-label="이름"
                aria-invalid={form.name.length > 0 && form.name.trim().length < 2}
              />
              {form.name.length > 0 && form.name.trim().length < 2 && (
                <p className="mt-1 text-sm text-ink-tertiary" role="status">
                  2자 이상 입력해 주세요
                </p>
              )}
              <p className="mt-2 text-ink-tertiary text-xs">
                {form.name.length}/10자
              </p>
            </div>
          </>
        )}

        {/* Step 1: 성별 */}
        {step === 1 && (
          <>
            <CharacterBubble
              character="mulgyeori"
              message={`${form.name}님, 성별을 알려주세요`}
            />
            <div className="mt-8 flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className={`flex-1 min-h-[52px] ${form.gender === "male" ? "!bg-brand !border-brand text-ink" : ""}`}
                onClick={() => {
                  setForm((f) => ({ ...f, gender: "male" }));
                  setTimeout(goNext, 300);
                }}
              >
                남성
              </Button>
              <Button
                variant="outline"
                size="lg"
                className={`flex-1 min-h-[52px] ${form.gender === "female" ? "!bg-accent !border-accent text-ink" : ""}`}
                onClick={() => {
                  setForm((f) => ({ ...f, gender: "female" }));
                  setTimeout(goNext, 300);
                }}
              >
                여성
              </Button>
            </div>
          </>
        )}

        {/* Step 2: 생년월일 */}
        {step === 2 && (
          <>
            <CharacterBubble
              character="mulgyeori"
              message="생년월일을 알려주세요"
            />
            <div className="mt-8">
              <BirthDatePicker
                value={form.birthDate}
                onChange={(v) => setForm((f) => ({ ...f, birthDate: v }))}
              />
            </div>
          </>
        )}

        {/* Step 3: 시진 */}
        {step === 3 && (
          <>
            <CharacterBubble
              character="mulgyeori"
              message="태어난 시간까지 알면 훨씬 정확해져요! 몰라도 전혀 괜찮아요~"
            />
            <div className="mt-8">
              <p className="text-ink text-sm mb-2">태어난 시간 (선택)</p>
              <div className="grid grid-cols-3 gap-2">
                {SIJIN_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        birthTime: form.birthTime === opt.value ? null : opt.value,
                      }))
                    }
                    className={`py-2 px-2 rounded-lg text-sm border transition-colors min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
                      form.birthTime === opt.value
                        ? "border-brand bg-brand/20 text-ink"
                        : "border-hanji-border bg-hanji-elevated text-ink"
                    }`}
                  >
                    <span className="font-medium">
                      {opt.label} {opt.hanja}
                    </span>
                    <span className="text-xs text-ink-muted">{opt.timeRange}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, birthTime: null }))}
                className="mt-2 text-ink-tertiary text-sm underline"
              >
                모르겠어요
              </button>
              <p className="mt-4 text-xs text-ink-muted">
                태어난 시간을 모르면 일주(日柱) 기반으로 분석해요. 나중에 수정할 수 있어요!
              </p>
            </div>
          </>
        )}

        {/* Step 4: 사진 */}
        {step === 4 && (
          <>
            <CharacterBubble
              character="bulkkori"
              message="얼굴에 숨은 동물상이 궁금하지 않아요? 셀카 한 장이면 충분해요!"
            />
            <div className="mt-8 p-4 rounded-xl bg-element-fire-pastel/40 border border-element-fire/30">
              <p className="text-ink-muted text-sm leading-relaxed">
                정면을 바라본 사진이 가장 정확해요. AI가 관상을 분석해 동물상을 알려줄게요!
              </p>
            </div>
            <p className="mt-2 text-[11px] text-ink-tertiary">
              이 사진은 관상 분석과 앱에서 궁합 매칭할 때 활용돼요.
            </p>
            <div className="mt-8">
              {form.photoPreview ? (
                <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-hanji-border">
                  <img
                    src={form.photoPreview}
                    alt="프로필 미리보기"
                    className="w-full h-full object-cover"
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm cursor-pointer">
                    다시 선택
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 rounded-2xl border-2 border-dashed border-hanji-border bg-hanji-secondary cursor-pointer">
                  <span className="text-ink-muted text-sm">사진 선택</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handlePhotoChange}
                  />
                </label>
              )}
            </div>
          </>
        )}

        {/* Step 5: 키 */}
        {step === 5 && (
          <>
            <CharacterBubble
              character="namuri"
              message="키가 어떻게 되세요?"
            />
            <div className="mt-8">
              <label className="block text-ink text-sm mb-2">키 (cm)</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.height}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 3);
                  setForm((f) => ({ ...f, height: v }));
                }}
                placeholder="예: 170"
                className="w-full h-12 px-4 rounded-lg border border-hanji-border bg-hanji-elevated text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </>
        )}

        {/* Step 6: 직업 */}
        {step === 6 && (
          <>
            <CharacterBubble
              character="namuri"
              message="어떤 일을 하고 계세요?"
            />
            <div className="mt-8">
              <label className="block text-ink text-sm mb-2">직업</label>
              <input
                type="text"
                value={form.occupation}
                onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))}
                placeholder="예: 마케터, 개발자, 대학생"
                className="w-full h-12 px-4 rounded-lg border border-hanji-border bg-hanji-elevated text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </>
        )}

        {/* Step 7: 활동지역 */}
        {step === 7 && (
          <>
            <CharacterBubble
              character="heuksuni"
              message="주로 어디서 활동하세요?"
            />
            <div className="mt-8 flex flex-wrap gap-2">
              {LOCATION_OPTIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, location: loc }));
                    setTimeout(goNext, 300);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm border min-h-[44px] ${
                    form.location === loc
                      ? "border-brand bg-brand/20 text-ink"
                      : "border-hanji-border bg-hanji-elevated text-ink"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 8: 체형 */}
        {step === 8 && (
          <>
            <CharacterBubble
              character="bulkkori"
              message="체형을 알려주세요!"
            />
            <div className="mt-8 flex flex-wrap gap-2">
              {BODY_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, bodyType: opt.value }));
                    setTimeout(goNext, 300);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm border min-h-[44px] ${
                    form.bodyType === opt.value
                      ? "border-brand bg-brand/20 text-ink"
                      : "border-hanji-border bg-hanji-elevated text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 9: 종교 */}
        {step === 9 && (
          <>
            <CharacterBubble
              character="soedongi"
              message="종교가 있으신가요?"
            />
            <div className="mt-8 flex flex-wrap gap-2">
              {RELIGION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, religion: opt.value }));
                    setTimeout(goNext, 300);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm border min-h-[44px] ${
                    form.religion === opt.value
                      ? "border-brand bg-brand/20 text-ink"
                      : "border-hanji-border bg-hanji-elevated text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 10: 자기소개 (건너뛰기 가능) */}
        {step === 10 && (
          <>
            <CharacterBubble
              character="mulgyeori"
              message="자기소개를 적어주세요! 건너뛰어도 괜찮아요~"
            />
            <div className="mt-8">
              <label className="block text-ink text-sm mb-2">자기소개</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value.slice(0, 300) }))}
                placeholder="취미, 성격, 하고 싶은 이야기 등 자유롭게 적어주세요"
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-hanji-border bg-hanji-elevated text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              />
              <p className="mt-1 text-right text-xs text-ink-tertiary">{form.bio.length}/300</p>
            </div>
          </>
        )}

        {/* Step 11: 관심사 (태그형 칩, 최대 10개, 건너뛰기 가능) */}
        {step === 11 && (
          <>
            <CharacterBubble
              character="namuri"
              message="관심사를 골라주세요! 건너뛰어도 돼요~"
            />
            <div className="mt-8">
              <p className="text-ink-muted text-xs mb-4">
                {form.interests.length}/{INTEREST_MAX_SELECT}개 선택
                {form.interests.length >= INTEREST_MAX_SELECT && (
                  <span className="text-red-600 ml-1">(최대)</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((label) => {
                  const selected = form.interests.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setForm((f) => {
                          if (selected)
                            return { ...f, interests: f.interests.filter((x) => x !== label) };
                          if (f.interests.length >= INTEREST_MAX_SELECT) return f;
                          return { ...f, interests: [...f.interests, label] };
                        });
                      }}
                      className={`px-4 py-2.5 rounded-full text-sm border min-h-[44px] transition-colors ${
                        selected
                          ? "border-brand bg-brand/20 text-ink"
                          : "border-hanji-border bg-hanji-elevated text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Step 12: 이상형 (건너뛰기 가능) */}
        {step === 12 && (
          <>
            <CharacterBubble
              character="bulkkori"
              message="어떤 사람을 만나고 싶어요? 건너뛰어도 돼요~"
            />
            <div className="mt-8">
              <label className="block text-ink text-sm mb-2">이상형</label>
              <textarea
                value={form.idealType}
                onChange={(e) => setForm((f) => ({ ...f, idealType: e.target.value.slice(0, 200) }))}
                placeholder="이상형을 자유롭게 적어주세요"
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-hanji-border bg-hanji-elevated text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              />
              <p className="mt-1 text-right text-xs text-ink-tertiary">{form.idealType.length}/200</p>
            </div>
          </>
        )}

        {/* Step 13: 확인 요약 */}
        {step === 13 && (
          <>
            <CharacterBubble
              character="mulgyeori"
              message="좋아요! 이제 조상님의 지혜를 빌려볼게요~"
            />
            <div className="mt-8 bg-hanji-elevated rounded-2xl border border-hanji-border p-4 space-y-3 text-sm">
              {[
                { label: "이름", value: form.name || "-", stepIndex: 0 },
                { label: "성별", value: form.gender === "male" ? "남성" : form.gender === "female" ? "여성" : "-", stepIndex: 1 },
                { label: "생년월일", value: formatDateDisplay(form.birthDate) || "-", stepIndex: 2 },
                {
                  label: "생시",
                  value: form.birthTime
                    ? SIJIN_OPTIONS.find((o) => o.value === form.birthTime)?.label ?? "-"
                    : "모르겠어요",
                  stepIndex: 3,
                },
                { label: "사진", value: form.photoPreview ? "등록됨" : "-", stepIndex: 4 },
                { label: "키", value: form.height ? `${form.height}cm` : "-", stepIndex: 5 },
                { label: "직업", value: form.occupation || "-", stepIndex: 6 },
                { label: "활동지역", value: form.location ?? "-", stepIndex: 7 },
                {
                  label: "체형",
                  value: BODY_TYPE_OPTIONS.find((o) => o.value === form.bodyType)?.label ?? "-",
                  stepIndex: 8,
                },
                {
                  label: "종교",
                  value: RELIGION_OPTIONS.find((o) => o.value === form.religion)?.label ?? "-",
                  stepIndex: 9,
                },
                {
                  label: "자기소개",
                  value: form.bio ? (form.bio.length > 20 ? `${form.bio.slice(0, 20)}...` : form.bio) : "-",
                  stepIndex: 10,
                },
                {
                  label: "관심사",
                  value:
                    form.interests.length > 0
                      ? form.interests.length <= 3
                        ? form.interests.join(", ")
                        : `${form.interests.slice(0, 2).join(", ")} 외 ${form.interests.length - 2}개`
                      : "-",
                  stepIndex: 11,
                },
                {
                  label: "이상형",
                  value: form.idealType
                    ? form.idealType.length > 20
                      ? `${form.idealType.slice(0, 20)}...`
                      : form.idealType
                    : "-",
                  stepIndex: 12,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-2 py-1"
                >
                  <p className="text-ink flex-1 min-w-0">
                    <span className="text-ink-muted">{row.label}</span> {row.value}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(row.stepIndex)}
                    className="shrink-0 text-xs text-brand font-medium underline hover:no-underline"
                  >
                    수정하기
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── CTA 영역: 스크롤 밖, 뷰포트 하단에 항상 고정 ── */}
      {step === 0 && (
        <CtaBar>
          <Button size="lg" className="w-full" disabled={!canProceedStep0} onClick={goNext}>
            다음
          </Button>
        </CtaBar>
      )}
      {step === 2 && (
        <CtaBar>
          <Button size="lg" className="w-full" disabled={!canProceedStep2} onClick={goNext}>
            다음
          </Button>
        </CtaBar>
      )}
      {step === 3 && (
        <CtaBar>
          <Button size="lg" className="w-full" onClick={goNext}>
            다음
          </Button>
        </CtaBar>
      )}
      {step === 4 && (
        <CtaBar>
          <Button size="lg" className="w-full" disabled={!canProceedStep4 || submitting} onClick={handleStep4Submit}>
            {submitting ? "저장 중…" : "다음"}
          </Button>
        </CtaBar>
      )}
      {step === 5 && (
        <CtaBar>
          <Button size="lg" className="w-full" disabled={!canProceedStep5} onClick={goNext}>
            다음
          </Button>
        </CtaBar>
      )}
      {step === 6 && (
        <CtaBar>
          <Button size="lg" className="w-full" disabled={!canProceedStep6} onClick={goNext}>
            다음
          </Button>
        </CtaBar>
      )}
      {step === 10 && (
        <CtaBar>
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="flex-1" onClick={goNext}>
              건너뛰기
            </Button>
            <Button size="lg" className="flex-1" onClick={goNext}>
              다음
            </Button>
          </div>
        </CtaBar>
      )}
      {step === 11 && (
        <CtaBar>
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="flex-1" onClick={goNext}>
              건너뛰기
            </Button>
            <Button size="lg" className="flex-1" onClick={goNext}>
              다음
            </Button>
          </div>
        </CtaBar>
      )}
      {step === 12 && (
        <CtaBar>
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="flex-1" onClick={goNext}>
              건너뛰기
            </Button>
            <Button size="lg" className="flex-1" onClick={goNext}>
              다음
            </Button>
          </div>
        </CtaBar>
      )}
      {step === 13 && (
        <CtaBar>
          {submitError && (
            <p className="text-sm text-red-600 mb-2" role="alert">
              {submitError}
            </p>
          )}
          <Button size="lg" className="w-full" disabled={submitting} onClick={handleStep13Submit}>
            {submitting ? "저장 중…" : "분석 시작"}
          </Button>
        </CtaBar>
      )}
    </MobileContainer>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-hanji">
          <p className="text-ink-muted text-sm">로딩 중…</p>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
