"use client";

import React from "react";
import { navigationConfig } from "@/config/navigation";
import { SidebarBrand } from "./sidebar-brand";
import { EmergencyCard } from "./emergency-card";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  showBrand?: boolean;
}

/**
 * Sidebar Component
 * 
 * Background uses bgColor (#f1f5f8 in light mode) - no white background.
 * Adheres to SOLID: Composed of single-responsibility subcomponents,
 * driven entirely by navigationConfig.
 */
export function Sidebar({ className, onNavigate, showBrand = true }: SidebarProps) {
  return (
    <aside
      className={cn(
        "w-64 shrink-0 h-screen sticky top-0 flex flex-col justify-between p-6 bg-bgColor dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200 select-none",
        className
      )}
    >
      {/* Top Section: Brand + Emergency + Main Navigation */}
      <div className="flex flex-col space-y-7">
        {/* Brand Header (Only shown when showBrand is true) */}
        {showBrand && (
          <div className="pt-1">
            <SidebarBrand brand={navigationConfig.brand} />
          </div>
        )}

        {/* Emergency Tile */}
        <div className="pt-1">
          <EmergencyCard config={navigationConfig.emergency} />
        </div>

        {/* Navigation Links */}
        <div className="pt-2">
          <SidebarNav
            items={navigationConfig.mainNav}
            ariaLabel="Clinic Management Navigation"
            onNavigate={onNavigate}
          />
        </div>
      </div>

      {/* Bottom Section: Settings + Theme Mode Switcher */}
      <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
        <SidebarNav
          items={navigationConfig.bottomNav}
          ariaLabel="System Navigation"
          onNavigate={onNavigate}
        />

        {/* Dark / Light / System Mode Switcher */}
        <div className="pt-1">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}