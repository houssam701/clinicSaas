import { NavigationConfig } from "@/types/navigation";

export const navigationConfig: NavigationConfig = {
  brand: {
    name: "BienSync",
    logoStart: "Bien",
    logoEnd: "Sync",
    href: "/dashboard",
  },
  emergency: {
    label: "Emergency",
    icon: "emergency",
    hasAlertDot: true,
    href: "/emergency",
    description: "Urgent care & emergency call line",
  },
  mainNav: [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: "dashboard",
      exact: true,
    },
    {
      id: "appointments",
      label: "Appointments",
      href: "/appointments",
      icon: "appointments",
    },
    {
      id: "patients",
      label: "Patients",
      href: "/patients",
      icon: "patients",
    },
    {
      id: "doctors",
      label: "Doctors",
      href: "/doctors",
      icon: "doctors",
    },
    {
      id: "messages",
      label: "Messages",
      href: "/messages",
      icon: "messages",
    },
    {
      id: "reviews",
      label: "Reviews",
      href: "/reviews",
      icon: "reviews",
    },
    {
      id: "finances",
      label: "Finances",
      href: "/finances",
      icon: "finances",
    },
  ],
  bottomNav: [
    {
      id: "settings",
      label: "Settings",
      href: "/settings",
      icon: "settings",
    },
  ],
};