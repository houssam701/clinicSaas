import type { PermissionModule } from "@/config/permissions";

export type NavIconName =
  | "dashboard"
  | "appointments"
  | "patients"
  | "doctors"
  | "finances"
  | "account"
  | "team";

export interface NavBadge {
  count?: number;
  text?: string;
  variant?: "danger" | "primary" | "neutral";
}

export interface NavItem {
  id: string;
  /** Shown only to users who can view this module (the SuperAdmin sees everything) */
  module?: PermissionModule;
  label: string;
  href: string;
  icon: NavIconName;
  badge?: NavBadge;
  exact?: boolean;
  disabled?: boolean;
}

export interface BrandConfig {
  name: string;
  logoStart: string;
  logoEnd: string;
  href: string;
}

export interface NavigationConfig {
  brand: BrandConfig;
  mainNav: NavItem[];
  bottomNav: NavItem[];
}