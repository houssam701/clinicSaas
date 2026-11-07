import Link from "next/link";
import { PATHS } from "@/config/path";
import { SLOT_MINUTES, layoutColumn, minuteLabel, visibleHours } from "@/lib/calendar-layout";
import { patientName } from "@/lib/patient-format";
import { STATUS_STYLE } from "@/components/appointments/status-style";
import { APPOINTMENT_STATUS_LABELS, AppointmentStatus, type AppointmentWithPeople } from "@/types/appointments";
import { cn } from "@/lib/utils";

/** Height of one hour on the grid, in px. */
const HOUR_PX = 64;
const PX_PER_MIN = HOUR_PX / 60;

export interface CalendarColumn {
  key: string;
  title: string;
  subtitle?: string;
  /** YYYY-MM-DD of this column (day view: the same for every column) */
  date: string;
  /** Who a booking made from this column is for: a staff id, null for unassigned */
  staffId: string | null;
  appointments: AppointmentWithPeople[];
  highlight?: boolean;
}

export interface AppointmentCalendarProps {
  columns: CalendarColumn[];
  zone: string;
  /** Empty slots become "book here" links */
  canCreate: boolean;
  /** Show the staff name on blocks (week view, where columns are days) */
  showStaff: boolean;
  /** Current page URL, so forms can come back here */
  back: string;
  /** Today's date and minute in the clinic's zone, for the "now" line */
  now: { date: string; minute: number };
  /** Narrow columns for many staff, wider for few */
  minColumnWidth: number;
}

/**
 * Time-grid calendar. Columns are staff members (day view) or days (week
 * view); appointments are placed by start time and duration in the clinic's
 * zone, overlapping ones side by side.
 */
export function AppointmentCalendar({
  columns,
  zone,
  canCreate,
  showStaff,
  back,
  now,
  minColumnWidth,
}: AppointmentCalendarProps) {
  const laidOut = columns.map((column) => ({ column, placed: layoutColumn(column.appointments, zone) }));
  const { startHour, endHour } = visibleHours(laidOut.flatMap((c) => c.placed));
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = (endHour - startHour) * HOUR_PX;
  const offsetPx = (minute: number) => (minute - startHour * 60) * PX_PER_MIN;
  const slots = Array.from({ length: ((endHour - startHour) * 60) / SLOT_MINUTES }, (_, i) => startHour * 60 + i * SLOT_MINUTES);
  const template = `3.5rem repeat(${columns.length}, minmax(${minColumnWidth}px, 1fr))`;

  return (
    <div className="overflow-x-auto rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70">
      <div className="min-w-max">
        {/* Column headers */}
        <div
          className="grid border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur"
          style={{ gridTemplateColumns: template }}
        >
          <div />
          {columns.map((column) => (
            <div
              key={column.key}
              className={cn(
                "border-l border-slate-200 dark:border-slate-800 px-3 py-2.5 text-center",
                column.highlight && "bg-primary/5"
              )}
            >
              <p className={cn("truncate text-sm font-bold", column.highlight ? "text-primary" : "text-slate-800 dark:text-white")}>
                {column.title}
              </p>
              {column.subtitle && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{column.subtitle}</p>}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid" style={{ gridTemplateColumns: template }}>
          {/* Hour labels */}
          <div className="relative" style={{ height: gridHeight }}>
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[11px] font-semibold tabular-nums text-slate-400"
                style={{ top: offsetPx(hour * 60) }}
              >
                {hour === startHour ? "" : minuteLabel(hour * 60)}
              </span>
            ))}
          </div>

          {laidOut.map(({ column, placed }) => (
            <div
              key={column.key}
              className={cn("relative border-l border-slate-200 dark:border-slate-800", column.highlight && "bg-primary/[0.03]")}
              style={{ height: gridHeight }}
            >
              {/* Hour and half-hour lines */}
              {hours.map((hour) => (
                <div key={hour} aria-hidden="true">
                  <div className="absolute inset-x-0 border-t border-slate-200 dark:border-slate-800" style={{ top: offsetPx(hour * 60) }} />
                  <div
                    className="absolute inset-x-0 border-t border-dashed border-slate-100 dark:border-slate-800/60"
                    style={{ top: offsetPx(hour * 60 + 30) }}
                  />
                </div>
              ))}

              {/* Empty slots: book here */}
              {canCreate &&
                slots.map((minute) => (
                  <Link
                    key={minute}
                    href={PATHS.appointments.new({
                      date: column.date,
                      time: minuteLabel(minute),
                      // "none" keeps a booking from the Unassigned column unassigned
                      staff: column.staffId ?? "none",
                      back,
                    })}
                    prefetch={false}
                    aria-label={`Book ${column.title} at ${minuteLabel(minute)}`}
                    className="group absolute inset-x-0 z-0 flex items-start px-2 pt-0.5 hover:bg-primary/5 focus-visible:bg-primary/10 focus:outline-none"
                    style={{ top: offsetPx(minute), height: SLOT_MINUTES * PX_PER_MIN }}
                  >
                    <span className="hidden text-[11px] font-semibold text-primary group-hover:inline group-focus-visible:inline">
                      + {minuteLabel(minute)}
                    </span>
                  </Link>
                ))}

              {/* Appointments */}
              {placed.map(({ item, startMinute, endMinute, lane, lanes }) => {
                const status = item.status as AppointmentStatus;
                const height = Math.max((endMinute - startMinute) * PX_PER_MIN - 2, 18);
                const compact = height < 44;
                const patient = item.patient ? patientName(item.patient) : "Unknown patient";
                const staff = item.staff ? patientName(item.staff) : "Unassigned";
                return (
                  <Link
                    key={item.id}
                    href={PATHS.appointments.edit(item.id, { back })}
                    prefetch={false}
                    title={`${minuteLabel(startMinute)}–${minuteLabel(endMinute)} · ${patient} · ${staff} · ${APPOINTMENT_STATUS_LABELS[status]}`}
                    className={cn(
                      "absolute z-10 overflow-hidden rounded-md border-l-4 px-2 py-1 text-xs shadow-xs transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
                      STATUS_STYLE[status].block
                    )}
                    style={{
                      top: offsetPx(startMinute) + 1,
                      height,
                      left: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`,
                    }}
                  >
                    {compact ? (
                      <span className="block truncate">
                        <span className="font-semibold tabular-nums">{minuteLabel(startMinute)}</span> {patient}
                      </span>
                    ) : (
                      <>
                        <span className="block truncate font-semibold tabular-nums">
                          {minuteLabel(startMinute)}–{minuteLabel(endMinute)}
                        </span>
                        <span className="block truncate font-bold">{patient}</span>
                        {showStaff && <span className="block truncate opacity-80">{staff}</span>}
                        {item.reason_for_visit && <span className="block truncate opacity-70">{item.reason_for_visit}</span>}
                      </>
                    )}
                    <span className="sr-only">, {APPOINTMENT_STATUS_LABELS[status]}</span>
                  </Link>
                );
              })}

              {/* Now */}
              {column.date === now.date && now.minute >= startHour * 60 && now.minute <= endHour * 60 && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-[15]" style={{ top: offsetPx(now.minute) }}>
                  <div className="relative border-t-2 border-rose-500">
                    <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-rose-500" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
