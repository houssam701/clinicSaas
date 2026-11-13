import type { Metadata } from "next";
import { ThemeProvider } from "@/context/theme-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { platformNavigationConfig } from "@/config/platform-navigation";
import { requirePageRole } from "@/services/page-guard";
import { UserRole } from "@/types/users";

export const metadata: Metadata = {
  title: "Platform | BienSync Clinic OS",
  description: "Platform administration across all clinics.",
};

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageRole([UserRole.SuperAdmin]);

  return (
    <ThemeProvider defaultTheme="light">
      <DashboardShell config={platformNavigationConfig}>{children}</DashboardShell>
    </ThemeProvider>
  );
}
