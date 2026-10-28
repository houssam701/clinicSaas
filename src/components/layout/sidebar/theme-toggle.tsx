"use client";

import React from "react";
import { useTheme, Theme } from "@/context/theme-context";
import { SunIcon, MoonIcon, MonitorIcon } from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";

interface ThemeOption {
  value: Theme;
  label: string;
  icon: React.ReactNode;
}

const themeOptions: ThemeOption[] = [
  { value: "light", label: "Light", icon: <SunIcon className="w-4 h-4" /> },
  { value: "system", label: "Auto", icon: <MonitorIcon className="w-4 h-4" /> },
  { value: "dark", label: "Dark", icon: <MoonIcon className="w-4 h-4" /> },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        "flex items-center justify-between p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-xl border border-slate-300/40 dark:border-slate-700/60",
        className
      )}
      role="group"
      aria-label="Theme selection"
    >
      {themeOptions.map((opt) => {
        const isSelected = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            aria-pressed={isSelected}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40",
              isSelected
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
            title={`Switch to ${opt.label} mode`}
          >
            {opt.icon}
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}