"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface LogoProps {
  /** Size preset for heart icon and typography */
  size?: LogoSize;
  /** Controls if the heart icon uses the CSS pulse animation */
  animated?: boolean;
  /** Whether to show the text ("BienSync") or only the heart icon */
  showText?: boolean;
  /** Whether to show the heart icon */
  showHeart?: boolean;
  /** Custom first word (default: "Bien") */
  bienText?: string;
  /** Custom second word (default: "Sync") */
  syncText?: string;
  /** If provided, wraps the logo inside a clean Next.js Link */
  href?: string;
  /** Root wrapper additional classes */
  className?: string;
  /** Text container additional classes */
  textClassName?: string;
  /** Classes applied specifically to "Bien" */
  bienClassName?: string;
  /** Classes applied specifically to "Sync" */
  syncClassName?: string;
  /** Classes applied directly to the heart */
  heartClassName?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** Optional click handler */
  onClick?: () => void;
}

const sizeConfig: Record<
  LogoSize,
  {
    pixelSize: number;
    heartClass: string;
    text: string;
    gap: string;
  }
> = {
  xs: {
    pixelSize: 20,
    heartClass: "w-5 h-5",
    text: "text-base",
    gap: "gap-1.5",
  },
  sm: {
    pixelSize: 24,
    heartClass: "w-6 h-6",
    text: "text-xl",
    gap: "gap-2",
  },
  md: {
    pixelSize: 30,
    heartClass: "w-7.5 h-7.5",
    text: "text-2xl",
    gap: "gap-2.5",
  },
  lg: {
    pixelSize: 36,
    heartClass: "w-9 h-9",
    text: "text-3xl",
    gap: "gap-3",
  },
  xl: {
    pixelSize: 48,
    heartClass: "w-12 h-12",
    text: "text-4xl",
    gap: "gap-3.5",
  },
};

/**
 * BienSync Medical Heart Icon
 * Overlapping dual-tone blue capsule lobes forming the distinctive heart mark.
 */
export function HeartIcon({
  size = 36,
  animated = true,
  className,
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 inline-flex items-center justify-center select-none",
        animated && "animate-pulse-heart",
        className
      )}
      style={{ width: `${size}px`, height: `${size}px`, minWidth: `${size}px`, minHeight: `${size}px` }}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full block"
        aria-hidden="true"
      >
        {/* Left Capsule Lobe (Vibrant Light Blue) */}
        <rect
          x="12"
          y="16"
          width="24"
          height="36"
          rx="12"
          fill="#60a5fa"
          transform="rotate(-35 24 34)"
        />

        {/* Right Capsule Lobe (Primary Deep Blue with opacity blend) */}
        <rect
          x="28"
          y="16"
          width="24"
          height="36"
          rx="12"
          fill="#2662f0"
          fillOpacity="0.88"
          transform="rotate(35 40 34)"
        />
      </svg>
    </div>
  );
}

/**
 * Clean BienSync Logo Component.
 * - Pure natural logo (no button container or box outline)
 * - No tagline or subtitle below it
 * - Auto-pumping heart
 * - Guaranteed visibility with explicit sizing
 * - Fully configurable via props
 */
export function Logo({
  size = "lg",
  animated = true,
  showText = true,
  showHeart = true,
  bienText = "Bien",
  syncText = "Sync",
  href,
  className,
  textClassName,
  bienClassName,
  syncClassName,
  heartClassName,
  ariaLabel,
  onClick,
}: LogoProps) {
  const currentSize = sizeConfig[size] ?? sizeConfig.lg;

  const content = (
    <div
      className={cn(
        "inline-flex items-center select-none",
        currentSize.gap,
        className
      )}
      onClick={onClick}
    >
      {/* Auto-pumping Heart Icon */}
      {showHeart && (
        <HeartIcon
          size={currentSize.pixelSize}
          animated={animated}
          className={heartClassName}
        />
      )}

      {/* Typography: "Bien" + "Sync" */}
      {showText && (
        <div className={cn("flex items-baseline leading-none", textClassName)}>
          <span
            className={cn(
              "font-extrabold tracking-tight text-slate-800 dark:text-white transition-colors",
              currentSize.text,
              bienClassName
            )}
          >
            {bienText}
          </span>
          <span
            className={cn(
              "font-extrabold tracking-tight text-primary transition-colors",
              currentSize.text,
              syncClassName
            )}
          >
            {syncText}
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center no-underline outline-none"
        aria-label={ariaLabel ?? `${bienText}${syncText} Home`}
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default Logo;