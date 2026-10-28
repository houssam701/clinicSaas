import type { Metadata } from "next";
import { ThemeProvider } from "@/context/theme-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export const metadata: Metadata = {
  title: "Dashboard | Medux Clinic OS",
  description: "Modern clinical SaaS dashboard with real-time appointments and patient telemetry.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider defaultTheme="light">
      <DashboardShell>{children}</DashboardShell>
    </ThemeProvider>
  );
}