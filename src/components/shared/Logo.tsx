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
  /** "inverse" renders the logo for use on a primary-coloured background */
  tone?: LogoTone;
}

export type LogoTone = "default" | "inverse";

const toneConfig: Record<
  LogoTone,
  { heartFill: string; heartLine: string; bien: string; sync: string }
> = {
  default: {
    heartFill: "fill-primary",
    heartLine: "stroke-white",
    bien: "text-slate-800 dark:text-white",
    sync: "text-primary",
  },
  inverse: {
    heartFill: "fill-white",
    heartLine: "stroke-primary",
    bien: "text-white",
    sync: "text-blue-200",
  },
};

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
 * A solid heart with a heartbeat line drawn across it.
 */
export function HeartIcon({
  size = 36,
  animated = true,
  className,
  tone = "default",
}: {
  size?: number;
  animated?: boolean;
  className?: string;
  tone?: LogoTone;
}) {
  const colors = toneConfig[tone];
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
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full block"
        aria-hidden="true"
      >
        {/* Solid heart */}
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          className={colors.heartFill}
        />

        {/* Heartbeat line that keeps drawing across the heart */}
        <path
          d="M4 12.2h4.2l1.8-3.6 2.6 7.2 1.9-3.6H20"
          pathLength={100}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(colors.heartLine, animated && "animate-heart-line")}
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
  tone = "default",
}: LogoProps) {
  const currentSize = sizeConfig[size] ?? sizeConfig.lg;
  const colors = toneConfig[tone];

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
          tone={tone}
        />
      )}

      {/* Typography: "Bien" + "Sync" */}
      {showText && (
        <div className={cn("flex items-baseline leading-none", textClassName)}>
          <span
            className={cn(
              "font-extrabold tracking-tight transition-colors",
              colors.bien,
              currentSize.text,
              bienClassName
            )}
          >
            {bienText}
          </span>
          <span
            className={cn(
              "font-extrabold tracking-tight transition-colors",
              colors.sync,
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