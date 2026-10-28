import React from "react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const stats = [
    { label: "Today's Appointments", value: "24", change: "+12%", trend: "up" },
    { label: "Active Patients", value: "1,420", change: "+8%", trend: "up" },
    { label: "Emergency Consults", value: "3", change: "Immediate", trend: "alert" },
    { label: "Monthly Revenue", value: "$48,250", change: "+15.3%", trend: "up" },
  ];

  const recentPatients = [
    { name: "Sarah Jenkins", time: "09:30 AM", doctor: "Dr. Alex Rivera", status: "In Consultation", type: "Cardiology" },
    { name: "Michael Chang", time: "10:15 AM", doctor: "Dr. Emily Watson", status: "Checked In", type: "General" },
    { name: "Amira Hassan", time: "11:00 AM", doctor: "Dr. Alex Rivera", status: "Upcoming", type: "Pediatrics" },
    { name: "David Kim", time: "11:45 AM", doctor: "Dr. Marcus Vance", status: "Upcoming", type: "Orthopedics" },
  ];

  return (
    <div className="space-y-8 bg-bgColor dark:bg-slate-950 min-h-full transition-colors">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            Clinic Overview
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            Real-time telemetry, appointments, and active practitioner roster.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="md">
            Export Report
          </Button>
          <Button variant="primary" size="md" >
            + New Appointment
          </Button>
        </div>
      </div>

      {/* KPI Cards (Clean surfaces matching bgColor design language) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-slate-200/50 dark:bg-slate-900/70 border border-slate-300/50 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all duration-200"
          >
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {stat.label}
            </span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                {stat.value}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  stat.trend === "alert"
                    ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                }`}
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Schedule Table Section */}
      <div className="rounded-3xl bg-slate-200/50 dark:bg-slate-900/70 border border-slate-300/50 dark:border-slate-800/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              Upcoming Patients Today
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live consultation queue and visit check-in status
            </p>
          </div>
          <span className="text-xs font-semibold text-primary hover:underline cursor-pointer">
            View full calendar &rarr;
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300/60 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Patient Name</th>
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3">Specialty</th>
                <th className="py-3 px-3">Practitioner</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300/40 dark:divide-slate-800/60 font-medium">
              {recentPatients.map((patient, idx) => (
                <tr key={idx} className="hover:bg-slate-300/20 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-3 text-slate-800 dark:text-white font-semibold">
                    {patient.name}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                    {patient.time}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                    {patient.type}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                    {patient.doctor}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <span
                      className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${
                        patient.status === "In Consultation"
                          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300"
                          : patient.status === "Checked In"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-slate-300/50 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {patient.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}