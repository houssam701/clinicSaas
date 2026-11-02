"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { HiOutlineCheckCircle, HiOutlineNoSymbol } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import {
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  PERMISSION_MODULE_INFO,
  type PermissionAction,
  type PermissionModule,
} from "@/config/permissions";
import {
  permissionFieldName,
  readPermissionGrid,
  type PermissionFlags,
  type PermissionGrid,
  type PermissionsFormState,
} from "@/lib/permission-form";
import { sameGrid } from "@/lib/permission-grid";

const NONE: PermissionFlags = { can_view: false, can_create: false, can_edit: false, can_delete: false };

/**
 * Applies one checkbox change with the same rule the API enforces:
 * create / edit / delete imply view, and removing view removes everything.
 */
function toggle(flags: PermissionFlags, action: PermissionAction, checked: boolean): PermissionFlags {
  if (action === "can_view") return checked ? { ...flags, can_view: true } : NONE;
  return { ...flags, [action]: checked, can_view: checked ? true : flags.can_view };
}

const quietButton =
  "inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20";

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      size="md"
      isLoading={pending}
      loadingText="Saving..."
      disabled={disabled && !pending}
    >
      Save access
    </Button>
  );
}

export interface PermissionsFormProps {
  /** Server action bound to the user id */
  action: (state: PermissionsFormState, formData: FormData) => Promise<PermissionsFormState>;
  initialGrid: PermissionGrid;
  /** Rows to show: Staff never get the management modules (Staff, Admins) */
  modules: readonly PermissionModule[];
  /** What the signed-in user can give: their own access (all of it for the SuperAdmin) */
  ceiling: PermissionGrid;
}

/**
 * Module × action grid for one user's access.
 * Submits the whole grid at once (PUT replaces every permission row).
 *
 * A cell can be ticked only when it is within the ceiling, or the user already
 * held it when the page loaded (so it can be removed and restored). The API
 * enforces the same rule.
 */
export function PermissionsForm({ action, initialGrid, modules, ceiling }: PermissionsFormProps) {
  const [saved, setSaved] = useState(initialGrid);
  const [grid, setGrid] = useState(initialGrid);
  const [state, formAction] = useActionState(async (prev: PermissionsFormState, formData: FormData) => {
    const result = await action(prev, formData);
    // What was submitted is now what's stored, so "unsaved changes" resets
    if (result.success) setSaved(readPermissionGrid(formData));
    return result;
  }, {});

  const dirty = !sameGrid(grid, saved);
  const canTick = (m: PermissionModule, a: PermissionAction) => ceiling[m][a] || saved[m][a];
  const lockedCount = modules.reduce((n, m) => n + PERMISSION_ACTIONS.filter((a) => !canTick(m, a)).length, 0);

  const setCell = (module: PermissionModule, permAction: PermissionAction, checked: boolean) =>
    setGrid((prev) => ({ ...prev, [module]: toggle(prev[module], permAction, checked) }));

  // Ticks every cell the user can give in this row; unticking clears the row
  const fillRow = (module: PermissionModule, checked: boolean, prev: PermissionGrid): PermissionFlags =>
    checked
      ? (Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, prev[module][a] || canTick(module, a)])) as PermissionFlags)
      : NONE;

  const setRow = (module: PermissionModule, checked: boolean) =>
    setGrid((prev) => ({ ...prev, [module]: fillRow(module, checked, prev) }));

  const setAll = (checked: boolean) =>
    setGrid((prev) => ({ ...prev, ...Object.fromEntries(modules.map((m) => [m, fillRow(m, checked, prev)])) }));

  return (
    <form action={formAction} className="space-y-4">
      {state.error && !dirty && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {state.error}
        </div>
      )}
      {state.success && !dirty && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {state.success}
        </div>
      )}

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setAll(true)} className={quietButton}>
          <HiOutlineCheckCircle aria-hidden="true" className="h-4 w-4" />
          Grant all
        </button>
        <button type="button" onClick={() => setAll(false)} className={quietButton}>
          <HiOutlineNoSymbol aria-hidden="true" className="h-4 w-4" />
          Revoke all
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Module</th>
              {PERMISSION_ACTIONS.map((a) => (
                <th key={a} scope="col" className="px-3 py-3 font-semibold text-center">
                  {PERMISSION_ACTION_LABELS[a]}
                </th>
              ))}
              <th scope="col" className="px-5 py-3 font-semibold text-center">Full access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {modules.map((module) => {
              const flags = grid[module];
              const info = PERMISSION_MODULE_INFO[module];
              const full = PERMISSION_ACTIONS.every((a) => flags[a] || !canTick(module, a)) && flags.can_view;
              return (
                <tr key={module} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <th scope="row" className="px-5 py-3.5 font-normal">
                    <span className="flex flex-wrap items-center gap-2 font-semibold text-slate-800 dark:text-white">
                      {module}
                      {!info.enforced && (
                        <span
                          title="The API does not check this module yet, so these switches have no effect for now."
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                        >
                          Not enforced yet
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{info.description}</span>
                  </th>
                  {PERMISSION_ACTIONS.map((a) => (
                    <td key={a} className="px-3 py-3.5 text-center">
                      <input
                        type="checkbox"
                        name={permissionFieldName(module, a)}
                        checked={flags[a]}
                        disabled={!canTick(module, a)}
                        title={canTick(module, a) ? undefined : "You don't have this access yourself, so you can't give it."}
                        onChange={(e) => setCell(module, a, e.target.checked)}
                        aria-label={`${module}: ${PERMISSION_ACTION_LABELS[a]}`}
                        className="h-5 w-5 rounded border-slate-300 accent-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-30"
                      />
                    </td>
                  ))}
                  <td className="px-5 py-3.5 text-center">
                    {/* Not submitted: it only flips the four boxes in this row */}
                    <input
                      type="checkbox"
                      checked={full}
                      disabled={!canTick(module, "can_view")}
                      onChange={(e) => setRow(module, e.target.checked)}
                      aria-label={`${module}: full access`}
                      className="h-5 w-5 rounded border-slate-300 accent-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-30"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Create, Edit and Delete include View. Removing View removes everything for that module.
        {lockedCount > 0 && " Greyed-out boxes are access you don't have yourself, so you can't give it."}
        {modules.includes("Staff") && " Access you remove is also removed from everyone this user created."}
      </p>

      <div className="flex items-center justify-end gap-3 pt-2">
        {dirty && (
          <button
            type="button"
            onClick={() => setGrid(saved)}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            Discard changes
          </button>
        )}
        <SaveButton disabled={!dirty} />
      </div>
    </form>
  );
}
