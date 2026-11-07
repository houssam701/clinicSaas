"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/select";
import { PATHS } from "@/config/path";
import { APPOINTMENT_STATUS_LABELS, AppointmentStatus, type AppointmentStaffMember } from "@/types/appointments";

export interface AppointmentFiltersProps {
  /** The clinic's admins (the people appointments are with) */
  staff: AppointmentStaffMember[];
  /** The signed-in admin, listed first as "Me" */
  meId?: string;
  /** An admin's id, "all" or "unassigned" */
  currentStaff: string;
  currentStatus?: string;
  /** The rest of the current query (view, mode, date), kept when a filter changes; page is dropped */
  keep: Record<string, string | undefined>;
}

/** Staff and status dropdowns that apply as soon as one changes. */
export function AppointmentFilters({ staff, meId, currentStaff, currentStatus, keep }: AppointmentFiltersProps) {
  const me = staff.find((m) => m.id === meId);
  const others = staff.filter((m) => m.id !== meId);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const apply = (next: { staff?: string; status?: string }) =>
    // staff is always sent explicitly ("all" too): the page's default differs per user
    startTransition(() => router.push(PATHS.appointments.list({ ...keep, staff: currentStaff, status: currentStatus, ...next })));

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={isPending}>
      <label htmlFor="filter-staff" className="sr-only">
        Whose appointments
      </label>
      <Select
        id="filter-staff"
        size="sm"
        wrapperClassName="w-full sm:w-48"
        value={currentStaff}
        onChange={(e) => apply({ staff: e.target.value })}
      >
        {me && (
          <option value={me.id}>
            Me ({me.first_name} {me.last_name})
          </option>
        )}
        <option value="all">All admins</option>
        {others.map((member) => (
          <option key={member.id} value={member.id}>
            {member.first_name} {member.last_name}
          </option>
        ))}
        <option value="unassigned">Unassigned</option>
      </Select>

      <label htmlFor="filter-status" className="sr-only">
        Status
      </label>
      <Select
        id="filter-status"
        size="sm"
        wrapperClassName="w-full sm:w-40"
        value={currentStatus ?? ""}
        onChange={(e) => apply({ status: e.target.value || undefined })}
      >
        <option value="">All statuses</option>
        {Object.values(AppointmentStatus).map((status) => (
          <option key={status} value={status}>
            {APPOINTMENT_STATUS_LABELS[status]}
          </option>
        ))}
      </Select>
    </div>
  );
}
