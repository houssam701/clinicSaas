import type { Metadata } from "next";
import { ThemeProvider } from "@/context/theme-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requirePageRole } from "@/services/page-guard";
import { UserRole } from "@/types/users";

export const metadata: Metadata = {
  title: "Dashboard | BienSync Clinic OS",
  description: "Your clinic's appointments and patients at a glance.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageRole([UserRole.Admin, UserRole.Staff]);

  return (
    <ThemeProvider defaultTheme="light">
      <DashboardShell>{children}</DashboardShell>
    </ThemeProvider>
  );
}
