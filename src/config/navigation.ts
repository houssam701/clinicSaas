import { NavigationConfig } from "@/types/navigation";
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
      id: "settings",
      label: "Settings",
      href: PATHS.settings,
      icon: "settings",
    },
  ],
};