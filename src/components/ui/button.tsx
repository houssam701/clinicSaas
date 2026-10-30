import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "link";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "text-white bg-gradient-to-r from-primary to-blue-700 shadow-[0_8px_16px_-4px_rgba(38,98,240,0.25)] hover:shadow-[0_12px_20px_-4px_rgba(38,98,240,0.4)] hover:-translate-y-0.5 active:translate-y-0 focus:ring-primary/30 border border-transparent",
  secondary:
    "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/80 hover:-translate-y-0.5 active:translate-y-0 focus:ring-slate-300",
  outline:
    "border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 active:translate-y-0 focus:ring-slate-200",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent focus:ring-slate-200",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:ring-rose-500/30 border border-transparent",
  link:
    "text-primary hover:text-blue-700 underline-offset-4 hover:underline p-0 h-auto font-semibold focus:ring-0 shadow-none border-0",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs font-semibold rounded-md gap-1.5",
  md: "px-4 py-2.5 text-sm font-semibold rounded-md gap-2",
  lg: "py-3.5 px-5 text-sm sm:text-base font-bold rounded-md gap-2.5",
  icon: "p-2.5 rounded-md justify-center items-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-4 cursor-pointer select-none",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          isDisabled &&
            "opacity-60 cursor-not-allowed pointer-events-none hover:translate-y-0 shadow-none",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
