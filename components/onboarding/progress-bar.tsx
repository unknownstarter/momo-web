import { ONBOARDING_STEP_COUNT } from "@/lib/constants";

interface ProgressBarProps {
  currentStep: number;
  totalSteps?: number;
}

export function ProgressBar({ currentStep, totalSteps = ONBOARDING_STEP_COUNT }: ProgressBarProps) {
  return (
    <div className="h-1 w-full bg-hanji-border rounded-full overflow-hidden">
      <div
        className="h-full bg-brand rounded-full transition-all duration-300 ease-out"
        style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
      />
    </div>
  );
}
