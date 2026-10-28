"use client";

import React from "react";
import { Sidebar } from "./sidebar/sidebar";
import { MobileSidebar } from "./sidebar/mobile-sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-bgColor dark:bg-slate-950 transition-colors duration-200">
      {/* Mobile Topbar & Sliding Drawer */}
      <MobileSidebar />

      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area: all backgrounds strictly use bgColor / dark:bg-slate-950 (no white) */}
      <main className="flex-1 min-w-0 bg-bgColor dark:bg-slate-950 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}