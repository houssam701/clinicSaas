import type { Metadata } from "next";
import { ThemeProvider } from "@/context/theme-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
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

  return (
    <ThemeProvider defaultTheme="light">
      <DashboardShell>{children}</DashboardShell>
    </ThemeProvider>
  );
}
