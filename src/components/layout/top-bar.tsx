import { ThemeMenu } from "@/components/layout/theme-menu";
import { ROLE_BADGE, ROLE_LABEL } from "@/config/roles";
import type { UserRole } from "@/types/users";

/** Who is signed in, as shown in the top bar. */
export interface ShellUser {
  firstName: string;
  role: UserRole;
  /** Where they are working: the clinic's name, or the platform */
  place: string;
}

/**
 * Top of every signed-in page: welcomes the user by name with their role and
 * where they are working, and holds the theme menu.
 */
export function TopBar({ user }: { user?: ShellUser }) {
  return (
    <header className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
      <div className="min-w-0">
        {user && (
          <>
            <p className="truncate text-lg font-bold text-slate-800 dark:text-white">Welcome back, {user.firstName}</p>
            <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${ROLE_BADGE[user.role]}`}>
                {ROLE_LABEL[user.role]}
              </span>
              <span className="truncate">{user.place}</span>
            </p>
          </>
        )}
      </div>
      <ThemeMenu />
    </header>
  );
}
