"use client";

import React from "react";
import Link from "next/link";
import { EmergencyActionConfig } from "@/types/navigation";
import { MicIcon } from "@/components/icons/nav-icons";

export function EmergencyCard({ config }: { config: EmergencyActionConfig }) {
  const content = (
    <div className="flex items-center gap-3.5 p-2 -mx-2 rounded-md transition-all duration-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 group cursor-pointer select-none">
      {/* Dark Charcoal Icon Tile */}
      <div className="relative shrink-0 w-11 h-11 rounded-md bg-slate-800 dark:bg-slate-700/90 text-white flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:bg-slate-900 transition-all">
        <MicIcon className="w-5 h-5 text-white" />
        
        {/* Red Alert Notification Dot (Top-Right of the mic tile) */}
        {config.hasAlertDot && (
          <span
            className="absolute -top-1 -right-1 flex h-3 w-3"
            aria-hidden="true"
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-bgColor dark:border-slate-800" />
          </span>
        )}
      </div>

      {/* Label */}
      <div className="flex flex-col">
        <span className="text-[15px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
          {config.label}
        </span>
      </div>
    </div>
  );

  if (config.href) {
    return (
      <Link
        href={config.href}
        className="block focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-md"
        aria-label={`${config.label} - Quick Urgent Care Call`}
      >
        {content}
      </Link>
    );
  }

  return <div role="button" tabIndex={0}>{content}</div>;
}