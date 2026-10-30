"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { IconType } from "react-icons";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  /** Called on Cancel, Esc, or a click on the backdrop */
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  isPending?: boolean;
  /** Shown in an alert box above the buttons, e.g. an API error */
  error?: string;
  tone?: "danger" | "primary";
  icon?: IconType;
}

const TONE = {
  danger: { iconWrap: "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400", button: "danger" },
  primary: { iconWrap: "bg-primary/10 text-primary", button: "primary" },
} as const;

/**
 * Reusable confirmation dialog built on the native <dialog>.
 *
 * - Portaled to <body> and only mounted while open, so it never inherits the
 *   layout of a table cell or a scroll container.
 * - A centered popup on every screen, capped to the viewport (scrolls inside).
 *   On phones the buttons stack full width.
 * - Esc and backdrop clicks close it, except while the action is running.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  pendingLabel,
  isPending = false,
  error,
  tone = "danger",
  icon: Icon = HiOutlineExclamationTriangle,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Open as a modal as soon as the element mounts
  const attach = useCallback((node: HTMLDialogElement | null) => {
    dialogRef.current = node;
    if (node && !node.open) node.showModal();
  }, []);

  if (!open || typeof document === "undefined") return null;

  const styles = TONE[tone];
  const requestClose = () => {
    if (!isPending) onClose();
  };

  return createPortal(
    <dialog
      ref={attach}
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? "confirm-dialog-description" : undefined}
      // Esc fires "cancel": keep the dialog while the action runs, otherwise let React close it
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      // A click on the dialog element itself is a click on the backdrop
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
      className={cn(
        "bg-white dark:bg-slate-900 text-left shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-[2px]",
        // Centered popup on every screen; never wider or taller than the viewport
        "m-auto box-border w-[calc(100vw-2rem)] max-w-md max-h-[calc(100dvh-2rem)] rounded-lg p-0",
        "overflow-x-hidden overflow-y-auto overscroll-contain",
      )}
    >
      {/* Padding lives here, so only clicks outside the card hit the <dialog> itself */}
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full",
              styles.iconWrap,
            )}
          >
            <Icon aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-lg font-bold text-slate-800 dark:text-white break-words">
              {title}
            </h2>
            {description && (
              <p
                id="confirm-dialog-description"
                className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={requestClose}
            disabled={isPending}
            className="w-full min-h-11 sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant={styles.button}
            size="md"
            onClick={onConfirm}
            isLoading={isPending}
            loadingText={pendingLabel}
            className="w-full min-h-11 sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
