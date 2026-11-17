import type { NavigationConfig, NavItem } from "@/types/navigation";
import { PATHS } from "@/config/path";

export const navigationConfig: NavigationConfig = {
  brand: {
    name: "BienSync",
    logoStart: "Bien",
    logoEnd: "Sync",
    href: PATHS.dashboard,
  },
  emergency: {
    label: "Emergency",
    icon: "emergency",
    hasAlertDot: true,
    href: PATHS.emergency,
    description: "Urgent care & emergency call line",
  },
  mainNav: [
    {
      id: "dashboard",
      label: "Dashboard",
      href: PATHS.dashboard,
      icon: "dashboard",
      exact: true,
    },
    {
      id: "appointments",
      label: "Appointments",
      href: PATHS.appointments,
      icon: "appointments",
    },
    {
      id: "patients",
      label: "Patients",
      href: PATHS.patients,
      icon: "patients",
    },
    {
      id: "doctors",
      label: "Doctors",
      href: PATHS.doctors,
      icon: "doctors",
    },
    {
      id: "messages",
      label: "Messages",
      href: PATHS.messages,
      icon: "messages",
    },
    {
      id: "reviews",
      label: "Reviews",
      href: PATHS.reviews,
      icon: "reviews",
    },
    {
      id: "finances",
      label: "Finances",
      href: PATHS.finances,
      icon: "finances",
    },
  ],
  bottomNav: [
    {
      id: "account",
      label: "Account",
      href: PATHS.account,
      icon: "account",
    },
  ],
};
/** Shown only to Admins who can see staff or admins (see clinicNavigationFor). */
export const teamNavItem: NavItem = {
  id: "team",
  label: "Team",
  href: PATHS.team.list(),
  icon: "team",
};

/** The clinic sidebar for the signed-in user: Team is added before Account when allowed. */
export function clinicNavigationFor({ showTeam }: { showTeam: boolean }): NavigationConfig {
  if (!showTeam) return navigationConfig;
  return { ...navigationConfig, bottomNav: [teamNavItem, ...navigationConfig.bottomNav] };
}
