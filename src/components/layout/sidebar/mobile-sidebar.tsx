"use client";

import React, { useState, useEffect, useRef } from "react";
import { SidebarBrand } from "./sidebar-brand";
import { Sidebar } from "./sidebar";
import { navigationConfig } from "@/config/navigation";
import type { NavigationConfig } from "@/types/navigation";
import { MenuIcon, CloseIcon } from "@/components/icons/nav-icons";

interface MobileSidebarProps {
  config?: NavigationConfig;
}

export function MobileSidebar({ config = navigationConfig }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on escape key & lock background scrolling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Click outside sidebar listener (detects clicks/taps outside drawerRef)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        isOpen &&
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick, { passive: true });
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <>
      {/* Sticky Mobile Topbar */}
      <div className="lg:hidden sticky top-0 z-30 w-full bg-bgColor/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3 flex items-center justify-between transition-colors">
        <SidebarBrand brand={config.brand} />

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          aria-label="Open navigation sidebar"
          aria-expanded={isOpen}
        >
          <MenuIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Blurred Backdrop Layer outside the sidebar (Clicking closes the drawer) */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md transition-opacity duration-300 lg:hidden cursor-pointer ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Sliding Mobile Sidebar Drawer */}
      <div
        ref={drawerRef}
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-bgColor dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
      >
        {/* Drawer Header with Close Button */}
        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          <SidebarBrand brand={config.brand} />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none"
            aria-label="Close navigation sidebar"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav & Content */}
        <div className="flex-1 overflow-y-auto">
          <Sidebar
            className="w-full h-full border-r-0 shadow-none pt-0 px-6"
            showBrand={false}
            config={config}
            onNavigate={() => setIsOpen(false)}
          />
        </div>
      </div>
    </>
  );
}