import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HiChevronLeft, HiChevronRight, HiOutlineMagnifyingGlass, HiXMark } from "react-icons/hi2";
import { FilterForm } from "@/components/ui/filter-form";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { loadMyAccess } from "@/lib/access-page";
import {
  addDays,
  formatDay,
  isIsoDate,
  startOfWeek,
  todayIn,
  zonedParts,
  zonedTimeToUtc,
} from "@/lib/time-zone";
import { totalPages } from "@/lib/pagination";
import { patientName } from "@/lib/patient-format";
import {
  CALENDAR_LIMIT,
  LIST_PAGE_SIZE,
  VIEW_COOKIE,
  isView,
  type AppointmentsMode,
  type AppointmentsView,
} from "@/config/appointments-view";
import { ViewSwitch } from "@/components/appointments/view-switch";
import { AppointmentFilters } from "@/components/appointments/appointment-filters";
import { DateJump } from "@/components/appointments/date-jump";
import { AppointmentCalendar, type CalendarColumn } from "@/components/appointments/appointment-calendar";
import { AppointmentList } from "@/components/appointments/appointment-list";
import { STATUS_STYLE } from "@/components/appointments/status-style";
import { Pagination } from "@/components/ui/pagination";
import {
  APPOINTMENT_STATUS_LABELS,
  AppointmentStatus,
  type AppointmentStaffMember,
  type AppointmentWithPeople,
} from "@/types/appointments";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/users";

const card = "rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70";

const segment = (active: boolean) =>
  cn(
    "inline-flex items-center rounded px-3 py-1.5 text-sm font-semibold transition-colors",
    active
      ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs"
      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
  );

const navButton =
  "inline-flex h-9 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors";

const NOTICES = { saved: "Appointment saved." };

type SearchParams = {
  view?: string;
  mode?: string;
  date?: string;
  staff?: string;
  status?: string;
  page?: string;
  saved?: string;
  search?: string;
};

/**
 * Server Component: Appointments
 *
 * Two views of the same appointments, switched with Calendar | List (the
 * last choice is remembered in a cookie):
 *   - Calendar: a time grid; Day has a column per staff member, Week a
 *     column per day. Clicking an empty slot books there.
 *   - List: an agenda grouped by day with quick status actions; besides Day
 *     and Week it can show everything Upcoming or Past.
 * A search (patient name/phone/email, admin, reason) opens the List across all
 * dates (Upcoming by default, or Past) and looks through all admins.
 * Times are in the clinic's zone. Data comes from GET /api/appointments and
 * GET /api/appointments/staff; every action is checked again by the API.
 */
export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const [access, cookieStore] = await Promise.all([loadMyAccess(), cookies()]);
  const can = access?.grid.Appointments;

  if (!can?.can_view) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Appointments</h1>
        <div className={`${card} p-10 text-center`}>
          <p className="font-semibold text-slate-700 dark:text-slate-200">You don&apos;t have access to appointments.</p>
          <p className="mt-1 text-sm text-slate-500">Ask your clinic admin to give you access to Appointments.</p>
        </div>
      </div>
    );
  }

  // ── What to show ──
  const zone = access!.clinic?.timezone ?? "UTC";
  const today = todayIn(zone);
  const search = params.search?.trim().slice(0, 100) || undefined;
  const savedView = cookieStore.get(VIEW_COOKIE)?.value;
  // Search results are a list across dates
  const view: AppointmentsView = search ? "list" : isView(params.view) ? params.view : isView(savedView) ? savedView : "calendar";
  const requestedMode = params.mode as AppointmentsMode | undefined;
  const listOnlyMode = requestedMode === "upcoming" || requestedMode === "past";
  const mode: AppointmentsMode =
    requestedMode === "week"
      ? "week"
      : listOnlyMode && view === "list"
        ? requestedMode
        : search && !requestedMode
          ? "upcoming"
          : "day";
  const openEnded = mode === "upcoming" || mode === "past";
  const date = isIsoDate(params.date) ? params.date : today;
  // Whose appointments: an Admin sees their own by default, Staff see all
  // admins; the filter can pick another admin, "all" or "unassigned".
  // A search looks through all admins unless one is picked.
  const me = access!.me;
  const isProvider = me.role === UserRole.Admin;
  const defaultStaff = isProvider && !search ? me.id : "all";
  const staffSelection = params.staff || defaultStaff;
  const staffFilter = staffSelection === "all" ? undefined : staffSelection; // sent to the API
  const statusFilter = Object.values(AppointmentStatus).includes(params.status as AppointmentStatus)
    ? (params.status as AppointmentStatus)
    : undefined;
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);

  const rangeStart = mode === "week" ? startOfWeek(date) : date;
  const rangeDays = mode === "week" ? 7 : 1;
  const nowIso = new Date().toISOString();
  const from =
    mode === "upcoming" ? nowIso : mode === "past" ? undefined : zonedTimeToUtc(rangeStart, "00:00", zone).toISOString();
  const to =
    mode === "past" ? nowIso : mode === "upcoming" ? undefined : zonedTimeToUtc(addDays(rangeStart, rangeDays), "00:00", zone).toISOString();

  // The URL keeps the staff choice only when it is not the default
  const query = {
    view,
    mode,
    date: openEnded ? undefined : date,
    staff: staffSelection === defaultStaff ? undefined : staffSelection,
    status: statusFilter,
    search,
  };
  const singleAdmin = staffFilter && staffFilter !== "unassigned" ? staffFilter : undefined;
  const back = PATHS.appointments.list({ ...query, page: view === "list" && page > 1 ? page : undefined });

  // ── Data ──
  const limit = view === "calendar" ? CALENDAR_LIMIT : LIST_PAGE_SIZE;
  const [apptRes, staffRes] = await Promise.all([
    serverApiFetch(
      API_PATHS.appointments.list({
        from,
        to,
        user_id: staffFilter,
        status: statusFilter,
        search,
        // Past: most recent first
        sort: mode === "past" ? "desc" : "asc",
        page: view === "list" ? page : 1,
        limit,
      })
    ),
    serverApiFetch(API_PATHS.appointments.staff),
  ]);
  const { appointments = [], total = 0 }: { appointments?: AppointmentWithPeople[]; total?: number } = apptRes.ok
    ? await apptRes.json()
    : {};
  const { staff = [] }: { staff?: AppointmentStaffMember[] } = staffRes.ok ? await staffRes.json() : {};
  const loadError = !apptRes.ok;

  if (view === "list" && !loadError && total > 0 && page > totalPages(total, LIST_PAGE_SIZE)) {
    redirect(PATHS.appointments.list({ ...query, page: totalPages(total, LIST_PAGE_SIZE) }));
  }

  // ── Period navigation ──
  const step = mode === "week" ? 7 : 1;
  const period =
    mode === "upcoming"
      ? "From now on"
      : mode === "past"
        ? "Before now, most recent first"
        : mode === "week"
          ? `${formatDay(rangeStart)} – ${formatDay(addDays(rangeStart, 6))}`
          : formatDay(date, "long");
  const periodLabel = search ? `Results for “${search}” · ${period}` : period;
  const hrefFor = (next: Partial<typeof query>) => PATHS.appointments.list({ ...query, ...next });
  const viewHrefs: Record<AppointmentsView, string> = {
    // The calendar shows one day or week, so leaving for it ends the search
    calendar: hrefFor({ view: "calendar", mode: openEnded ? "day" : mode, date, search: undefined }),
    list: hrefFor({ view: "list" }),
  };
  const modes: { id: AppointmentsMode; label: string }[] = [
    { id: "day", label: "Day" },
    { id: "week", label: "Week" },
    ...(view === "list"
      ? [
          { id: "upcoming" as const, label: "Upcoming" },
          { id: "past" as const, label: "Past" },
        ]
      : []),
  ];

  // ── Calendar columns ──
  const nowParts = zonedParts(new Date(), zone);
  const now = { date: nowParts.date, minute: nowParts.hour * 60 + nowParts.minute };
  let columns: CalendarColumn[] = [];
  if (view === "calendar") {
    if (mode === "week") {
      columns = Array.from({ length: 7 }, (_, i) => {
        const day = addDays(rangeStart, i);
        const items = appointments.filter((a) => zonedParts(new Date(a.scheduled_time), zone).date === day);
        return {
          key: day,
          title: formatDay(day),
          subtitle: items.length ? `${items.length} booked` : undefined,
          date: day,
          staffId: singleAdmin ?? null,
          appointments: items,
          highlight: day === today,
        };
      });
    } else {
      // One column per admin shown; someone no longer listed (e.g. a former
      // admin) still gets a column when they hold appointments that day
      const people = new Map(staff.map((m) => [m.id, m] as const));
      for (const a of appointments) if (a.user_id && a.staff && !people.has(a.user_id)) people.set(a.user_id, { ...a.staff, role: "" });
      const shown = singleAdmin
        ? [people.get(singleAdmin) ?? { id: singleAdmin, first_name: singleAdmin === me.id ? me.first_name : "Admin", last_name: singleAdmin === me.id ? me.last_name : "", role: "" }]
        : staffFilter === "unassigned"
          ? []
          : [...people.values()];
      columns = shown.map((member) => {
        const items = appointments.filter((a) => a.user_id === member.id);
        return {
          key: member.id,
          title: member.id === me.id ? `${patientName(member)} (you)` : patientName(member),
          subtitle: items.length ? `${items.length} booked` : "No bookings",
          date,
          staffId: member.id,
          appointments: items,
          highlight: member.id === me.id && shown.length > 1,
        };
      });
      const unassigned = appointments.filter((a) => !a.user_id);
      if (staffFilter === "unassigned" || (!staffFilter && (unassigned.length > 0 || people.size === 0))) {
        columns.push({
          key: "unassigned",
          title: "Unassigned",
          subtitle: unassigned.length ? `${unassigned.length} booked` : undefined,
          date,
          staffId: null,
          appointments: unassigned,
        });
      }
    }
  }

  const notice = params.saved ? NOTICES.saved : undefined;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Appointments</h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            Your clinic&apos;s schedule. Times are in {zone.replace(/_/g, " ")}.
          </p>
        </div>
        {can.can_create && (
          <Link
            href={PATHS.appointments.new({ date: openEnded ? today : date, staff: singleAdmin, back })}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md text-white bg-gradient-to-r from-primary to-blue-700 shadow-[0_8px_16px_-4px_rgba(38,98,240,0.25)] hover:-translate-y-0.5 transition-all"
          >
            + New appointment
          </Link>
        )}
      </div>

      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <ViewSwitch current={view} hrefFor={viewHrefs} />
          <nav aria-label="Period" className="inline-flex rounded-md bg-slate-200/70 dark:bg-slate-800 p-1">
            {modes.map((m) => (
              <Link
                key={m.id}
                href={hrefFor({ mode: m.id, date: m.id === "upcoming" || m.id === "past" ? undefined : date })}
                aria-current={mode === m.id ? "page" : undefined}
                className={segment(mode === m.id)}
              >
                {m.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!openEnded && (
            <>
              <Link href={hrefFor({ date: addDays(date, -step) })} className={navButton} aria-label={`Previous ${mode}`}>
                <HiChevronLeft aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link href={hrefFor({ date: today })} className={navButton} aria-current={date === today ? "date" : undefined}>
                Today
              </Link>
              <Link href={hrefFor({ date: addDays(date, step) })} className={navButton} aria-label={`Next ${mode}`}>
                <HiChevronRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <DateJump date={date} keep={{ view, mode, staff: query.staff, status: statusFilter, search }} />
            </>
          )}
          <AppointmentFilters
            staff={staff}
            meId={isProvider ? me.id : undefined}
            currentStaff={staffSelection}
            currentStatus={statusFilter}
            keep={{ view, mode, date: openEnded ? undefined : date, search }}
          />
        </div>
      </div>

      {/* Search: across all dates, in the list (submitted on Enter or Search, not per letter) */}
      <FilterForm
        key={search ?? ""}
        action={PATHS.appointments.list()}
        field="search"
        initialValue={search}
        submitLabel="Search"
        trailing={
          search && (
            <>
              <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-slate-300 dark:bg-slate-700" />
              <Link
                href={hrefFor({ search: undefined })}
                aria-label="Reset search"
                className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              >
                <HiXMark aria-hidden="true" className="h-4 w-4 transition-transform duration-150 group-hover:rotate-90" />
                Reset
              </Link>
            </>
          )
        }
      >
        <input type="hidden" name="view" value="list" />
        <input type="hidden" name="mode" value={mode === "past" ? "past" : "upcoming"} />
        {params.staff && <input type="hidden" name="staff" value={params.staff} />}
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <label htmlFor="appointment-search" className="sr-only">
          Search appointments by patient, phone, admin or reason
        </label>
        <div className="relative w-full sm:w-96">
          <HiOutlineMagnifyingGlass
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            id="appointment-search"
            name="search"
            type="search"
            defaultValue={search ?? ""}
            placeholder="Search by patient, phone, admin or reason"
            className="block h-9 w-full pl-9 pr-3 text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-white placeholder-slate-400 transition-all hover:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </FilterForm>

      <h2 className="text-lg font-bold text-slate-800 dark:text-white">{periodLabel}</h2>

      {/* Content */}
      {loadError ? (
        <p className={`${card} p-8 text-center text-sm text-red-600`}>Could not load appointments. Please refresh the page.</p>
      ) : view === "calendar" ? (
        <>
          {total > CALENDAR_LIMIT && (
            <p role="status" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Showing the first {CALENDAR_LIMIT} of {total} appointments. Filter by staff or switch to Day to see them all.
            </p>
          )}
          {columns.length === 0 ? (
            <p className={`${card} p-8 text-center text-sm text-slate-500`}>No staff to show.</p>
          ) : (
            <AppointmentCalendar
              columns={columns}
              zone={zone}
              canCreate={can.can_create}
              showStaff={mode === "week" && !singleAdmin}
              back={back}
              now={now}
              minColumnWidth={mode === "week" ? 120 : 170}
            />
          )}
          <ul aria-label="Status colors" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {Object.values(AppointmentStatus).map((status) => (
              <li key={status} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", STATUS_STYLE[status].dot)} />
                {APPOINTMENT_STATUS_LABELS[status]}
              </li>
            ))}
            {can.can_create && <li className="text-slate-400">Click an empty slot to book it.</li>}
          </ul>
        </>
      ) : appointments.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <p className="font-semibold text-slate-700 dark:text-slate-200">
            {search ? `No ${mode === "past" ? "past" : "upcoming"} appointments match “${search}”.` : "No appointments for this period."}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {search ? (
              <>
                Try{" "}
                <Link href={hrefFor({ mode: mode === "past" ? "upcoming" : "past" })} className="font-semibold text-primary hover:underline">
                  {mode === "past" ? "Upcoming" : "Past"}
                </Link>
                {staffFilter || statusFilter ? ", or clear the filters" : ", or fewer words"}.
              </>
            ) : staffFilter || statusFilter ? (
              "Try clearing the filters."
            ) : can.can_create ? (
              "Book one with New appointment."
            ) : (
              "Booked appointments will appear here."
            )}
          </p>
        </div>
      ) : (
        <>
          <AppointmentList
            appointments={appointments}
            zone={zone}
            can={can}
            canViewPatients={!!access!.grid.Patients.can_view}
            back={back}
          />
          <Pagination
            page={page}
            pageSize={LIST_PAGE_SIZE}
            total={total}
            itemLabel={total === 1 ? "appointment" : "appointments"}
            hrefForPage={(p) => PATHS.appointments.list({ ...query, page: p })}
          />
        </>
      )}
    </div>
  );
}
