"use client";

import { useState, useTransition } from "react";
import { HiOutlineTrash } from "react-icons/hi2";
import { deleteUserAction } from "@/actions/delete-user";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
}

/**
 * Row action that asks for confirmation, then calls deleteUserAction.
 * The action revalidates the list, so the row disappears without a page reload.
 */
export function DeleteUserButton({ userId, userName }: DeleteUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const open = () => {
    setError(undefined);
    setIsOpen(true);
  };

  const confirm = () => {
    startTransition(async () => {
      const result = await deleteUserAction(userId);
      if (result.error) setError(result.error);
      else setIsOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 text-xs font-semibold text-rose-600 dark:text-rose-400 shadow-xs hover:bg-rose-600 hover:border-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20 transition-colors"
        aria-label={`Delete ${userName}`}
      >
        <HiOutlineTrash aria-hidden="true" className="h-3.5 w-3.5" />
        Delete
      </button>

      <ConfirmDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={confirm}
        isPending={isPending}
        error={error}
        icon={HiOutlineTrash}
        title={`Delete ${userName}?`}
        description="They will lose access right away. Their permissions are removed and their appointments are kept but unassigned. This cannot be undone."
        confirmLabel="Delete user"
        pendingLabel="Deleting..."
      />
    </>
  );
}
