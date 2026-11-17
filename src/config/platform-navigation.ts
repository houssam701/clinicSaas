import { NavigationConfig } from "@/types/navigation";
import { PATHS } from "@/config/path";

export const platformNavigationConfig: NavigationConfig = {
  brand: {
    name: "BienSync",
    logoStart: "Bien",
    logoEnd: "Sync",
    href: PATHS.platform.dashboard,
  },
  mainNav: [
    {
      id: "platform-dashboard",
      label: "Dashboard",
      href: PATHS.platform.dashboard,
      icon: "dashboard",
      exact: true,
    },
    {
      id: "platform-clinics",
      label: "Clinics",
      href: PATHS.platform.clinics,
      icon: "patients",
    },
    {
      id: "platform-users",
      label: "Users",
      href: PATHS.platform.users.list(),
      icon: "doctors",
    },
  ],
  bottomNav: [
    {
      id: "platform-settings",
      label: "Settings",
      href: PATHS.platform.settings,
      icon: "settings",
    },
  ],
};
