import Link from "next/link";
import { serverApiFetch } from "@/lib/server-api";
import { CreateUserForm } from "@/components/platform/create-user-form";
import type { ClinicModel } from "@/types/clinics";

/**
 * Server Component: New Platform User
 *
 * Loads clinics from GET /api/clinics for the clinic picker.
 * The form itself posts to POST /api/users through createUserAction.
 */
export default async function NewPlatformUserPage() {
  const clinicsRes = await serverApiFetch("/api/clinics");
  const clinics: ClinicModel[] = clinicsRes.ok ? (await clinicsRes.json()).clinics : [];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/platform/users"
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
        >
          &larr; Back to users
        </Link>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          New user
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          Give someone access to BienSync. Admins and staff are tied to one clinic.
        </p>
      </div>

      <div className="rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-6 sm:p-8">
        <CreateUserForm clinics={clinics.map(({ id, name }) => ({ id, name }))} />
      </div>
    </div>
  );
}
