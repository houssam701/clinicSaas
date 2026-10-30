import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { UserForm } from "@/components/platform/user-form";
import { updateUserAction } from "@/actions/update-user";
import { UserRole, type PublicUser } from "@/types/users";
import type { ClinicModel } from "@/types/clinics";

/**
 * Server Component: Edit Platform User
 *
 * Loads the user (GET /api/users/[id]) and the clinic list (GET /api/clinics)
 * in parallel. The form submits to PATCH /api/users/[id] via updateUserAction.
 */
export default async function EditPlatformUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [userRes, clinicsRes] = await Promise.all([
    serverApiFetch(API_PATHS.users.detail(id)),
    serverApiFetch(API_PATHS.clinics.list()),
  ]);

  if (!userRes.ok) notFound();
  const { user }: { user: PublicUser } = await userRes.json();

  // The single SuperAdmin is managed from settings, not from this list
  if (user.role === UserRole.SuperAdmin) notFound();

  const clinics: ClinicModel[] = clinicsRes.ok ? (await clinicsRes.json()).clinics : [];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={PATHS.platform.users.list()}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
        >
          &larr; Back to users
        </Link>
        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          Edit {user.first_name} {user.last_name}
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          Update their details, role or clinic.
        </p>
      </div>

      <div className="rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-6 sm:p-8">
        <UserForm
          mode="edit"
          action={updateUserAction.bind(null, user.id)}
          clinics={clinics.map(({ id, name }) => ({ id, name }))}
          initialValues={{
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role as UserRole,
            clinic_id: user.clinic_id ?? "",
          }}
        />
      </div>
    </div>
  );
}
