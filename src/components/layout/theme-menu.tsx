"use client";

import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { HiChevronDown, HiOutlineCheck, HiOutlineComputerDesktop, HiOutlineMoon, HiOutlineSun } from "react-icons/hi2";
import { useTheme, type Theme } from "@/context/theme-context";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; icon: IconType }[] = [
  { value: "light", label: "Light", icon: HiOutlineSun },
  { value: "dark", label: "Dark", icon: HiOutlineMoon },
  { value: "system", label: "Auto", icon: HiOutlineComputerDesktop },
];

/** Small button in the top bar showing the current theme; opens Light / Dark / Auto. */
export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[0];

  // Close on a click outside or on Esc (focus goes back to the button)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Theme: ${current.label}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
      >
        <current.icon aria-hidden="true" className="h-4 w-4" />
        <span className="hidden sm:inline">{current.label}</span>
        <HiChevronDown aria-hidden="true" className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="group"
          aria-label="Choose a theme"
          className="absolute right-0 z-30 mt-1 w-36 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-lg"
        >
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = value === theme;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  selected
                    ? "bg-primary/5 text-primary"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                <span className="flex-1 text-left">{label}</span>
                {selected && <HiOutlineCheck aria-hidden="true" className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
