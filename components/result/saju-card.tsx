"use client";

/**
 * SajuCard — 앱과 동일한 카드 스타일 (elevated / flat)
 */
export function SajuCard({
  variant = "elevated",
  borderColor,
  children,
  className = "",
}: {
  variant?: "elevated" | "flat";
  borderColor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card p-4 ${
        variant === "elevated"
          ? "bg-hanji-elevated shadow-medium border border-hanji-border"
          : "bg-black/5 dark:bg-white/5 border border-hanji-border"
      } ${className}`}
      style={borderColor ? { borderColor } : undefined}
    >
      {children}
    </div>
  );
}
