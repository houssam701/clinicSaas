export type NavIconName =
  | "dashboard"
  | "appointments"
  | "patients"
  | "doctors"
  | "messages"
  | "reviews"
  | "finances"
  | "settings"
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
  emergency: EmergencyActionConfig;
  mainNav: NavItem[];
  bottomNav: NavItem[];
}