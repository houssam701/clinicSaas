"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem } from "@/types/navigation";
import { NavIcon } from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  item: NavItem;
  onNavigate?: () => void;
}

export function SidebarItem({ item, onNavigate }: SidebarItemProps) {
  const pathname = usePathname();

  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || (item.href !== "/" && pathname?.startsWith(`${item.href}/`));

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3.5 px-3 py-2.5 rounded-md font-medium text-[15px] transition-all duration-150 select-none group focus:outline-none focus:ring-2 focus:ring-primary/40",
        isActive
          ? "bg-slate-200/70 dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs"
          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/40 dark:hover:bg-slate-800/50"
      )}
    >
      <span
        className={cn(
          "shrink-0 transition-transform duration-150 group-hover:scale-105",
          isActive
            ? "text-slate-900 dark:text-white"
            : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
        )}
      >
        <NavIcon name={item.icon} className="w-5 h-5" />
      </span>

      <span className="truncate">{item.label}</span>

      {item.badge && (
        <span
          className={cn(
            "ml-auto text-xs px-2 py-0.5 rounded-md font-semibold",
            item.badge.variant === "danger"
              ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
              : item.badge.variant === "primary"
              ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300"
              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
          )}
        >
          {item.badge.text ?? item.badge.count}
        </span>
      )}
    </Link>
  );
}