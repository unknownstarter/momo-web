"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CharacterBubble } from "@/components/onboarding/character-bubble";
import { ProgressBar } from "@/components/onboarding/progress-bar";
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

export interface OnboardingFormData {
  name: string;
  gender: "male" | "female" | null;
  birthDate: string;
  birthTime: string | null;
  photoPreview: string | null;
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

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingFormData>(initialForm);

  const goNext = useCallback(() => {
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
      return { ...f, photoPreview: URL.createObjectURL(file) };
    });
  };

  useEffect(() => {
    return () => {
      if (form.photoPreview) URL.revokeObjectURL(form.photoPreview);
    };
  }, [form.photoPreview]);

  return (
    <MobileContainer className="flex flex-col min-h-dvh bg-hanji">
      {/* 뒤로가기: 맨 위, 터치 영역 넉넉하게 */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
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
      <div className="px-5 pb-4">
        <ProgressBar currentStep={step} />
      </div>

      <main className="flex-1 px-5 pt-4 pb-8 flex flex-col">
        {/* Step 0: 이름 */}
        {step === 0 && (
          <>
            <CharacterBubble
              character="mulgyeori"
              message="반가워요! 이름이 뭐예요?"
            />
            <div className="mt-6">
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
            <div className="mt-auto pt-8">
              <Button
                size="lg"
                className="w-full"
                disabled={!canProceedStep0}
                onClick={goNext}
              >
                다음
              </Button>
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
            <div className="mt-6 flex gap-3">
              <Button
                variant={form.gender === "male" ? "primary" : "outline"}
                size="lg"
                className="flex-1 min-h-[52px]"
                onClick={() => {
                  setForm((f) => ({ ...f, gender: "male" }));
                  setTimeout(goNext, 300);
                }}
              >
                남성
              </Button>
              <Button
                variant={form.gender === "female" ? "primary" : "outline"}
                size="lg"
                className="flex-1 min-h-[52px]"
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
            <div className="mt-6">
              <label className="block text-ink text-sm mb-1">생년월일</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, birthDate: e.target.value }))
                }
                className="w-full h-12 px-4 rounded-lg border border-hanji-border bg-hanji-elevated text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="mt-auto pt-8">
              <Button
                size="lg"
                className="w-full"
                disabled={!canProceedStep2}
                onClick={goNext}
              >
                다음
              </Button>
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
            <div className="mt-6">
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
              <p className="mt-3 text-xs text-ink-muted">
                태어난 시간을 모르면 일주(日柱) 기반으로 분석해요. 나중에 수정할 수 있어요!
              </p>
            </div>
            <div className="mt-auto pt-8">
              <Button size="lg" className="w-full" onClick={goNext}>
                다음
              </Button>
            </div>
          </>
        )}

        {/* Step 4: 사진 (궁합 매칭 활용 안내) */}
        {step === 4 && (
          <>
            <CharacterBubble
              character="bulkkori"
              message="얼굴에 숨은 동물상이 궁금하지 않아요? 셀카 한 장이면 충분해요!"
            />
            <div className="mt-4 p-4 rounded-xl bg-element-fire-pastel/40 border border-element-fire/30">
              <p className="text-ink-muted text-sm leading-relaxed">
                정면을 바라본 사진이 가장 정확해요. AI가 관상을 분석해 동물상을 알려줄게요!
              </p>
            </div>
            <p className="mt-2 text-[11px] text-ink-tertiary">
              이 사진은 관상 분석과 앱에서 궁합 매칭할 때 활용돼요.
            </p>
            <div className="mt-6">
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
            <div className="mt-auto pt-8">
              <Button
                size="lg"
                className="w-full"
                disabled={!canProceedStep4}
                onClick={goNext}
              >
                다음
              </Button>
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
            <div className="mt-6">
              <label className="block text-ink text-sm mb-1">키 (cm)</label>
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
            <div className="mt-auto pt-8">
              <Button
                size="lg"
                className="w-full"
                disabled={!canProceedStep5}
                onClick={goNext}
              >
                다음
              </Button>
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
            <div className="mt-6">
              <label className="block text-ink text-sm mb-1">직업</label>
              <input
                type="text"
                value={form.occupation}
                onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))}
                placeholder="예: 마케터, 개발자, 대학생"
                className="w-full h-12 px-4 rounded-lg border border-hanji-border bg-hanji-elevated text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="mt-auto pt-8">
              <Button
                size="lg"
                className="w-full"
                disabled={!canProceedStep6}
                onClick={goNext}
              >
                다음
              </Button>
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
            <div className="mt-6 flex flex-wrap gap-2">
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
            <div className="mt-6 flex flex-wrap gap-2">
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
            <div className="mt-6 flex flex-wrap gap-2">
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
            <div className="mt-6">
              <label className="block text-ink text-sm mb-1">자기소개</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value.slice(0, 300) }))}
                placeholder="취미, 성격, 하고 싶은 이야기 등 자유롭게 적어주세요"
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-hanji-border bg-hanji-elevated text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              />
              <p className="mt-1 text-right text-xs text-ink-tertiary">{form.bio.length}/300</p>
            </div>
            <div className="mt-auto pt-8 flex gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={goNext}>
                건너뛰기
              </Button>
              <Button size="lg" className="flex-1" onClick={goNext}>
                다음
              </Button>
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
            <div className="mt-6">
              <p className="text-ink-muted text-xs mb-3">
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
            <div className="mt-auto pt-8 flex gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={goNext}>
                건너뛰기
              </Button>
              <Button size="lg" className="flex-1" onClick={goNext}>
                다음
              </Button>
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
            <div className="mt-6">
              <label className="block text-ink text-sm mb-1">이상형</label>
              <textarea
                value={form.idealType}
                onChange={(e) => setForm((f) => ({ ...f, idealType: e.target.value.slice(0, 200) }))}
                placeholder="이상형을 자유롭게 적어주세요"
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-hanji-border bg-hanji-elevated text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
              />
              <p className="mt-1 text-right text-xs text-ink-tertiary">{form.idealType.length}/200</p>
            </div>
            <div className="mt-auto pt-8 flex gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={goNext}>
                건너뛰기
              </Button>
              <Button size="lg" className="flex-1" onClick={goNext}>
                다음
              </Button>
            </div>
          </>
        )}

        {/* Step 13: 확인 요약 → 행별 수정하기 + 분석 시작 */}
        {step === 13 && (
          <>
            <CharacterBubble
              character="mulgyeori"
              message="좋아요! 이제 조상님의 지혜를 빌려볼게요~"
            />
            <div className="mt-6 bg-hanji-elevated rounded-2xl border border-hanji-border p-4 space-y-3 text-sm">
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
            <div className="mt-auto pt-8">
              <Link href={ROUTES.RESULT_LOADING} className="block w-full">
                <Button size="lg" className="w-full">
                  분석 시작
                </Button>
              </Link>
            </div>
          </>
        )}
      </main>
    </MobileContainer>
  );
}
