import { NavigationConfig } from "@/types/navigation";

export const platformNavigationConfig: NavigationConfig = {
  brand: {
    name: "BienSync",
    logoStart: "Bien",
    logoEnd: "Sync",
    href: "/platform/dashboard",
  },
  mainNav: [
    {
      id: "platform-dashboard",
      label: "Dashboard",
      href: "/platform/dashboard",
      icon: "dashboard",
      exact: true,
    },
    {
      id: "platform-clinics",
      label: "Clinics",
      href: "/platform/clinics",
      icon: "patients",
    },
    {
      id: "platform-users",
      label: "Users",
      href: "/platform/users",
      icon: "doctors",
    },
  ],
  bottomNav: [
    {
      id: "platform-settings",
      label: "Settings",
      href: "/platform/settings",
      icon: "settings",
    },
  ],
};
