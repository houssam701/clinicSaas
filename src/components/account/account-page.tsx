import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineEnvelope,
  HiOutlineShieldCheck,
  HiOutlineUser,
} from "react-icons/hi2";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS } from "@/config/path";
import { UserRole, type PublicUser } from "@/types/users";
import type { ClinicModel } from "@/types/clinics";

const ROLE_BADGE: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  [UserRole.Admin]: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  [UserRole.Staff]: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const ROLE_HINT: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: "Manages clinics and users across the whole platform.",
  [UserRole.Admin]: "Manages their clinic and its staff.",
  [UserRole.Staff]: "Works day to day inside their clinic.",
};

const card = "rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function Detail({ icon: Icon, label, children }: { icon: IconType; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-1 break-words text-sm sm:text-base font-medium text-slate-800 dark:text-white">{children}</dd>
      </div>
    </div>
  );
}

/**
 * Server Component: Account
 *
 * The signed-in user's own profile, from GET /api/auth/me (any role).
 * Shared by the clinic workspace (/account) and the platform (/platform/account).
 */
export default async function AccountPage() {
  const res = await serverApiFetch(API_PATHS.auth.me);
  const data: { user: PublicUser; clinic: ClinicModel | null } | null = res.ok ? await res.json() : null;

  if (!data) {
    return (
      <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
        Couldn&apos;t load your account. Refresh the page to try again.
      </p>
    );
  }

  const { user, clinic } = data;
  const role = user.role as UserRole;
  const initials = `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Account</h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          Your profile and access on BienSync.
        </p>
      </div>

      {/* Identity */}
      <section className={`${card} flex flex-col sm:flex-row sm:items-center gap-5 p-6`}>
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-700 text-xl font-extrabold text-white shadow-[0_8px_16px_-4px_rgba(38,98,240,0.25)]"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <h2 className="break-words text-xl font-extrabold text-slate-800 dark:text-white">
            {user.first_name} {user.last_name}
          </h2>
          <p className="break-all text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
          <span className={`mt-2 inline-block px-2 py-0.5 rounded-md text-xs font-bold ${ROLE_BADGE[role]}`}>
            {role}
          </span>
        </div>
      </section>

      {/* Details */}
      <section className={card} aria-labelledby="account-details">
        <h2
          id="account-details"
          className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300"
        >
          Profile details
        </h2>
        <dl className="grid sm:grid-cols-2">
          <Detail icon={HiOutlineUser} label="Full name">
            {user.first_name} {user.last_name}
          </Detail>
          <Detail icon={HiOutlineEnvelope} label="Email">
            {user.email}
          </Detail>
          <Detail icon={HiOutlineShieldCheck} label="Role">
            {role}
            <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">{ROLE_HINT[role]}</span>
          </Detail>
          <Detail icon={HiOutlineBuildingOffice2} label="Clinic">
            {clinic ? (
              <>
                {clinic.name}
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">{clinic.clinic_type}</span>
              </>
            ) : (
              "All clinics (platform)"
            )}
          </Detail>
          <Detail icon={HiOutlineCalendarDays} label="Member since">
            {formatDate(user.created_at)}
          </Detail>
          <Detail icon={HiOutlineClock} label="Last updated">
            {formatDate(user.updated_at)}
          </Detail>
        </dl>
      </section>
    </div>
  );
}
