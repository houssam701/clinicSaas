import Link from "next/link";
import type { IconType } from "react-icons";
import {
  HiOutlineBuildingOffice2,
  HiOutlineExclamationTriangle,
  HiOutlinePlus,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineIdentification,
} from "react-icons/hi2";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { formatDate, patientName } from "@/lib/patient-format";
import { ROLE_LABEL } from "@/config/roles";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/types/users";
import type { PlatformOverview } from "@/types/platform";

const card = "rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70";
const th = "px-5 py-3 font-semibold";

const primaryAction =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md text-white bg-gradient-to-r from-primary to-blue-700 shadow-[0_8px_16px_-4px_rgba(38,98,240,0.25)] hover:-translate-y-0.5 transition-all";
const secondaryAction =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors";

function Tile({ icon: Icon, label, value, hint, href }: { icon: IconType; label: string; value: number; hint?: string; href?: string }) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        <Icon aria-hidden="true" className="h-4 w-4" />
        {label}
      </span>
      <span className="mt-2 block text-3xl font-black tracking-tight text-slate-800 dark:text-white tabular-nums">{value}</span>
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </>
  );
  return href ? (
    <Link href={href} className={`${card} block p-5 transition-colors hover:border-primary/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20`}>
      {body}
    </Link>
  ) : (
    <div className={`${card} p-5`}>{body}</div>
  );
}

/**
 * Server Component: Platform overview (SuperAdmin home)
 *
 * The whole platform at a glance, from GET /api/platform/overview: clinics,
 * admins, staff and patients; what was added this month; clinics that have
 * no admin yet (each with a shortcut to add one); clinics per type; and the
 * newest clinics and users.
 */
export default async function PlatformDashboardPage() {
  const res = await serverApiFetch(API_PATHS.platform.overview);
  const overview: PlatformOverview | null = res.ok ? (await res.json()).overview : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Platform overview</h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">Clinics and the people using BienSync.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={PATHS.platform.users.new()} className={secondaryAction}>
            <HiOutlinePlus aria-hidden="true" className="h-4 w-4" />
            New user
          </Link>
          <Link href={PATHS.platform.clinics.new} className={primaryAction}>
            <HiOutlinePlus aria-hidden="true" className="h-4 w-4" />
            New clinic
          </Link>
        </div>
      </div>

      {!overview ? (
        <div className={`${card} p-8 text-center text-sm text-red-600`}>Could not load the overview. Please refresh the page.</div>
      ) : (
        <>
          {/* Needs attention: a clinic nobody can manage */}
          {overview.without_admin.count > 0 && (
            <section className="rounded-md border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
              <h2 className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                <HiOutlineExclamationTriangle aria-hidden="true" className="h-5 w-5" />
                {overview.without_admin.count === 1 ? "1 clinic has no admin" : `${overview.without_admin.count} clinics have no admin`}
              </h2>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300/90">Nobody can sign in to manage them until you add one.</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {overview.without_admin.clinics.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={PATHS.platform.users.new({ clinic_id: c.id })}
                      className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 dark:border-amber-900 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <HiOutlinePlus aria-hidden="true" className="h-3.5 w-3.5" />
                      Add an admin to {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Totals */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile
              icon={HiOutlineBuildingOffice2}
              label="Clinics"
              value={overview.totals.clinics}
              hint={`${overview.this_month.clinics} added this month`}
              href={PATHS.platform.clinics.list()}
            />
            <Tile icon={HiOutlineIdentification} label="Admins" value={overview.totals.admins} href={PATHS.platform.users.list({ role: UserRole.Admin })} />
            <Tile icon={HiOutlineUserGroup} label="Staff" value={overview.totals.staff} href={PATHS.platform.users.list({ role: UserRole.Staff })} />
            <Tile icon={HiOutlineUsers} label="Patients" value={overview.totals.patients} hint={`${overview.this_month.patients} added this month`} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Newest clinics */}
            <section className={`${card} overflow-x-auto xl:col-span-2`}>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-4">
                <h2 className="font-bold text-slate-800 dark:text-white">Newest clinics</h2>
                <Link href={PATHS.platform.clinics.list()} className="text-sm font-semibold text-primary hover:underline">
                  All clinics
                </Link>
              </div>
              {overview.recent_clinics.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">No clinics yet. Add the first one with New clinic.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th scope="col" className={th}>Clinic</th>
                      <th scope="col" className={`${th} text-right`}>Admins</th>
                      <th scope="col" className={`${th} text-right`}>Staff</th>
                      <th scope="col" className={`${th} text-right`}>Patients</th>
                      <th scope="col" className={`${th} whitespace-nowrap`}>Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {overview.recent_clinics.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3.5">
                          <Link href={PATHS.platform.clinics.edit(c.id)} className="font-semibold text-slate-800 hover:text-primary dark:text-white">
                            {c.name}
                          </Link>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">{c.clinic_type}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          {c.admins > 0 ? <span className="text-slate-600 dark:text-slate-300">{c.admins}</span> : <Badge tone="amber" variant="tag">None</Badge>}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{c.staff}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{c.patients}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400">{formatDate(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <div className="space-y-6">
              {/* Clinic types */}
              <section className={card}>
                <h2 className="border-b border-slate-200 dark:border-slate-800 px-5 py-4 font-bold text-slate-800 dark:text-white">Clinics by type</h2>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {overview.clinics_by_type.map((t) => (
                    <li key={t.clinic_type}>
                      <Link
                        href={PATHS.platform.clinics.list({ clinic_type: t.clinic_type })}
                        className="flex items-center justify-between gap-4 px-5 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{t.clinic_type}</span>
                        <span className="font-bold tabular-nums text-slate-800 dark:text-white">{t.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              {/* This month */}
              <section className={`${card} p-5`}>
                <h2 className="font-bold text-slate-800 dark:text-white">This month</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  {[
                    ["Clinics added", overview.this_month.clinics],
                    ["Patients added", overview.this_month.patients],
                    ["Appointments", overview.this_month.appointments],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                      <dd className="font-bold tabular-nums text-slate-800 dark:text-white">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          </div>

          {/* Newest users */}
          <section className={`${card} overflow-x-auto`}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <h2 className="font-bold text-slate-800 dark:text-white">Newest users</h2>
              <Link href={PATHS.platform.users.list()} className="text-sm font-semibold text-primary hover:underline">
                All users
              </Link>
            </div>
            {overview.recent_users.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No users yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {overview.recent_users.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3.5 text-sm">
                    <span className="min-w-0">
                      <Link href={PATHS.platform.users.edit(u.id)} className="font-semibold text-slate-800 hover:text-primary dark:text-white">
                        {patientName(u)}
                      </Link>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {ROLE_LABEL[u.role]} · {u.clinic?.name ?? "No clinic"}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">{formatDate(u.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
