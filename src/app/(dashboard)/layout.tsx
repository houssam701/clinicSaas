import type { Metadata } from "next";
import { cookies } from "next/headers";
import { WELCOME_COOKIE } from "@/config/welcome";
import { ThemeProvider } from "@/context/theme-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { clinicNavigationFor } from "@/config/navigation";
import { loadMyAccess } from "@/lib/access-page";
import { requirePageRole } from "@/services/page-guard";
import { UserRole } from "@/types/users";
import type { ShellUser } from "@/components/layout/top-bar";

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
  const [access, cookieStore] = await Promise.all([loadMyAccess(), cookies()]);
  const showTeam =
    access?.me.role === UserRole.Admin && (access.grid.Staff.can_view || access.grid.Admins.can_view);

  const user: ShellUser | null = access && {
    firstName: access.me.first_name,
    role: access.me.role as UserRole,
    place: access.clinic?.name ?? "Your clinic",
  };

  return (
    <ThemeProvider defaultTheme="light">
      <DashboardShell config={clinicNavigationFor({ grid: access?.grid, showTeam })} user={user ?? undefined} showWelcome={cookieStore.has(WELCOME_COOKIE)}>
        {children}
      </DashboardShell>
    </ThemeProvider>
  );
}
