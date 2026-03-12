import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
}

const sizeClasses = {
  sm: "h-10 text-[13px] px-4 rounded-lg",
  md: "h-11 text-sm px-5 rounded-button",
  lg: "h-[52px] text-base px-8 rounded-[14px]",
};

const variantClasses = {
  primary:
    "bg-[#2D2D2D] text-white hover:opacity-90 active:opacity-80 disabled:opacity-50",
  outline:
    "border-2 border-hanji-border bg-transparent text-ink hover:bg-hanji-secondary",
  ghost: "bg-transparent text-ink hover:bg-hanji-secondary",
};

export function Button({
  variant = "primary",
  size = "lg",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={[
        "font-semibold transition-opacity min-h-[44px] min-w-[44px] inline-flex items-center justify-center",
        sizeClasses[size],
        variantClasses[variant],
        className,
      ].join(" ")}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
