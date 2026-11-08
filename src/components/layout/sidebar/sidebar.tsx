"use client";

import React from "react";
import { navigationConfig } from "@/config/navigation";
import type { NavigationConfig } from "@/types/navigation";
import { SidebarBrand } from "./sidebar-brand";
import { SidebarNav } from "./sidebar-nav";
import { LogoutButton } from "./logout-button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  showBrand?: boolean;
  config?: NavigationConfig;
}

/**
 * Sidebar Component
 * 
 * Background uses bgColor (#f1f5f8 in light mode) - no white background.
 * Adheres to SOLID: Composed of single-responsibility subcomponents,
 * driven entirely by navigationConfig. The caller sets its size: pinned to the
 * screen on desktop (DashboardShell), content height in the drawer (MobileSidebar).
 */
export function Sidebar({ className, onNavigate, showBrand = true, config = navigationConfig }: SidebarProps) {
  return (
    <aside
      className={cn(
        "shrink-0 flex flex-col justify-between p-6 bg-bgColor dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 shadow-[6px_0_24px_-10px_rgba(15,23,42,0.18)] dark:shadow-[6px_0_24px_-10px_rgba(0,0,0,0.6)] z-10 transition-colors duration-200 select-none",
        className
      )}
    >
      {/* Top Section: Brand + Main Navigation */}
      <div className="flex flex-col space-y-7">
        {/* Brand Header (Only shown when showBrand is true) */}
        {showBrand && (
          <div className="pt-1">
            <SidebarBrand brand={config.brand} />
          </div>
        )}

        {/* Navigation Links */}
        <div className="pt-2">
          <SidebarNav
            items={config.mainNav}
            ariaLabel="Clinic Management Navigation"
            onNavigate={onNavigate}
          />
        </div>
      </div>

      {/* Bottom Section: Account + Log out */}
      <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
        <SidebarNav
          items={config.bottomNav}
          ariaLabel="System Navigation"
          onNavigate={onNavigate}
        />

        <LogoutButton />
      </div>
    </aside>
  );
}