"use client";

import { useState, useTransition } from "react";
import { HiOutlineCheck, HiOutlineNoSymbol, HiOutlineXMark } from "react-icons/hi2";
import { updateAppointmentStatusAction } from "@/actions/update-appointment-status";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AppointmentStatus } from "@/types/appointments";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    status: AppointmentStatus.Completed,
    label: "Complete",
    icon: HiOutlineCheck,
    className: "border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:border-emerald-600 hover:text-white dark:border-emerald-900/60 dark:text-emerald-400",
    confirm: { title: "Mark as completed?", body: "The visit took place. This cannot be changed afterwards.", label: "Mark completed" },
  },
  {
    status: AppointmentStatus.NoShow,
    label: "No-show",
    icon: HiOutlineNoSymbol,
    className: "border-amber-200 text-amber-700 hover:bg-amber-500 hover:border-amber-500 hover:text-white dark:border-amber-900/60 dark:text-amber-400",
    confirm: { title: "Mark as no-show?", body: "The patient did not come. The slot is freed. This cannot be changed afterwards.", label: "Mark no-show" },
  },
  {
    status: AppointmentStatus.Canceled,
    label: "Cancel",
    icon: HiOutlineXMark,
    className: "border-rose-200 text-rose-600 hover:bg-rose-600 hover:border-rose-600 hover:text-white dark:border-rose-900/60 dark:text-rose-400",
    confirm: { title: "Cancel this appointment?", body: "The slot is freed for other bookings. This cannot be undone.", label: "Cancel appointment" },
  },
] as const;

/**
 * Complete / No-show / Cancel for a scheduled appointment, each confirmed
 * first (the API does not allow changing a finished appointment again).
 */
export function StatusButtons({ appointmentId, patient, size = "sm" }: { appointmentId: string; patient: string; size?: "sm" | "md" }) {
  const [pending, setPending] = useState<(typeof ACTIONS)[number] | null>(null);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    if (!pending) return;
    startTransition(async () => {
      const result = await updateAppointmentStatusAction(appointmentId, pending.status);
      if (result.error) return setError(result.error);
      setPending(null);
    });
  };

  return (
    <>
      {ACTIONS.map((action) => (
        <button
          key={action.status}
          type="button"
          onClick={() => {
            setError(undefined);
            setPending(action);
          }}
          aria-label={`${action.label}: ${patient}`}
          className={cn(
            "inline-flex items-center rounded-md border bg-white dark:bg-slate-900 font-semibold shadow-xs transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
            size === "sm" ? "gap-1.5 px-2.5 py-1.5 text-xs" : "gap-2 px-4 py-2.5 text-sm",
            action.className
          )}
        >
          <action.icon aria-hidden="true" className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
          {action.label}
        </button>
      ))}

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        isPending={isPending}
        error={error}
        tone={pending?.status === AppointmentStatus.Completed ? "primary" : "danger"}
        icon={pending?.icon}
        title={pending?.confirm.title ?? ""}
        description={pending ? `${patient}. ${pending.confirm.body}` : undefined}
        confirmLabel={pending?.confirm.label ?? ""}
        pendingLabel="Saving..."
      />
    </>
  );
}
