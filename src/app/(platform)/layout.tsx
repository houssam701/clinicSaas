import type { Metadata } from "next";
import { cookies } from "next/headers";
import { WELCOME_COOKIE } from "@/config/welcome";
import { ThemeProvider } from "@/context/theme-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { platformNavigationConfig } from "@/config/platform-navigation";
import { requirePageRole } from "@/services/page-guard";
import { UserRole } from "@/types/users";
import { loadMyAccess } from "@/lib/access-page";
import type { ShellUser } from "@/components/layout/top-bar";

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

  const [access, cookieStore] = await Promise.all([loadMyAccess(), cookies()]);
  const user: ShellUser | null = access && {
    firstName: access.me.first_name,
    role: access.me.role as UserRole,
    place: "Platform administration",
  };

  return (
    <ThemeProvider defaultTheme="light">
      <DashboardShell config={platformNavigationConfig} user={user ?? undefined} showWelcome={cookieStore.has(WELCOME_COOKIE)}>
        {children}
      </DashboardShell>
    </ThemeProvider>
  );
}
