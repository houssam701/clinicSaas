"use client";

import React from "react";
import { Sidebar } from "./sidebar/sidebar";
import { MobileSidebar } from "./sidebar/mobile-sidebar";
import { TopBar, type ShellUser } from "./top-bar";
import { WelcomeOverlay } from "./welcome-overlay";
import { navigationConfig } from "@/config/navigation";
import type { NavigationConfig } from "@/types/navigation";

interface DashboardShellProps {
  children: React.ReactNode;
  config?: NavigationConfig;
  /** The signed-in user, welcomed in the top bar */
  user?: ShellUser;
  /** True on the first page after signing in */
  showWelcome?: boolean;
}

export function DashboardShell({ children, config = navigationConfig, user, showWelcome = false }: DashboardShellProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-bgColor dark:bg-slate-950 transition-colors duration-200">
      {showWelcome && user && <WelcomeOverlay firstName={user.firstName} />}

      {/* Mobile Topbar & Sliding Drawer */}
      <MobileSidebar config={config} />

      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar config={config} className="w-64 h-screen sticky top-0" />
      </div>

      {/* Main Content Area: all backgrounds strictly use bgColor / dark:bg-slate-950 (no white) */}
      <main className="flex-1 min-w-0 bg-bgColor dark:bg-slate-950 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full">
          <TopBar user={user} />
          {children}
        </div>
      </main>
    </div>
  );
}