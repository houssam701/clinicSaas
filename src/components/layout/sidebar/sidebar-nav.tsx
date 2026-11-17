"use client";

import React from "react";
import { NavItem } from "@/types/navigation";
import { SidebarItem } from "./sidebar-item";

interface SidebarNavProps {
  items: NavItem[];
  ariaLabel?: string;
  onNavigate?: () => void;
}

export function SidebarNav({ items, ariaLabel = "Main Navigation", onNavigate }: SidebarNavProps) {
  return (
    <nav aria-label={ariaLabel} className="w-full">
      <ul className="space-y-1.5 list-none m-0 p-0">
        {items.map((item) => (
          <li key={item.id} className="m-0 p-0">
            <SidebarItem item={item} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </nav>
  );
}