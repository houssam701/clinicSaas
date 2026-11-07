import type { PermissionModule } from "@/config/permissions";

export type NavIconName =
  | "dashboard"
  | "appointments"
  | "patients"
  | "doctors"
  | "messages"
  | "reviews"
  | "finances"
  | "account"
  | "team"
  | "emergency"
  | "sun"
  | "moon"
  | "monitor";

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

export interface EmergencyActionConfig {
  label: string;
  icon: "emergency";
  hasAlertDot: boolean;
  href?: string;
  description?: string;
}

export interface BrandConfig {
  name: string;
  logoStart: string;
  logoEnd: string;
  href: string;
}

export interface NavigationConfig {
  brand: BrandConfig;
  emergency?: EmergencyActionConfig;
  mainNav: NavItem[];
  bottomNav: NavItem[];
}