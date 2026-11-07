"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineTrash } from "react-icons/hi2";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

export interface DeleteButtonProps {
  /** A server action bound to the item, e.g. deletePatientAction.bind(null, id) */
  action: () => Promise<{ error?: string }>;
  /** Names the item for screen readers: "Delete <itemName>" */
  itemName: string;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  /** Where to go after deleting (from PATHS), e.g. the list when deleting from a detail page */
  redirectTo?: string;
  /** "md" for page headers, "sm" (default) for table rows */
  size?: "sm" | "md";
}

/**
 * Bordered red Delete button that asks for confirmation, then runs the bound
 * server action. The action revalidates the page, so a deleted row disappears
 * without a reload; an API error is shown inside the dialog.
 */
export function DeleteButton({
  action,
  itemName,
  title,
  description,
  confirmLabel,
  redirectTo,
  size = "sm",
}: DeleteButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    startTransition(async () => {
      const result = await action();
      if (result.error) return setError(result.error);
      setIsOpen(false);
      if (redirectTo) router.push(redirectTo);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(undefined);
          setIsOpen(true);
        }}
        className={cn(
          "inline-flex items-center rounded-md border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 font-semibold text-rose-600 dark:text-rose-400 shadow-xs hover:bg-rose-600 hover:border-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20 transition-colors",
          size === "sm" ? "gap-1.5 px-3 py-1.5 text-xs" : "gap-2 px-4 py-2.5 text-sm"
        )}
        aria-label={`Delete ${itemName}`}
      >
        <HiOutlineTrash aria-hidden="true" className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        Delete
      </button>

      <ConfirmDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={confirm}
        isPending={isPending}
        error={error}
        icon={HiOutlineTrash}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        pendingLabel="Deleting..."
      />
    </>
  );
}
