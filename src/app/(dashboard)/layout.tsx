import type { Metadata } from "next";
import { ThemeProvider } from "@/context/theme-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { clinicNavigationFor } from "@/config/navigation";
import { loadMyAccess } from "@/lib/access-page";
import { requirePageRole } from "@/services/page-guard";
import { UserRole } from "@/types/users";

export const metadata: Metadata = {
  title: "Dashboard | Medux Clinic OS",
  description: "Modern clinical SaaS dashboard with real-time appointments and patient telemetry.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageRole([UserRole.Admin, UserRole.Staff]);

  // Module links follow the user's access; Team appears for Admins who can see staff or other admins
  const access = await loadMyAccess();
  const showTeam =
    access?.me.role === UserRole.Admin && (access.grid.Staff.can_view || access.grid.Admins.can_view);

  return (
    <ThemeProvider defaultTheme="light">
      <DashboardShell config={clinicNavigationFor({ grid: access?.grid, showTeam })}>{children}</DashboardShell>
    </ThemeProvider>
  );
}
