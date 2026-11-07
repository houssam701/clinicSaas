"use client";

import { useState } from "react";
import { HiOutlineArrowUpTray, HiOutlineLink, HiOutlinePlus } from "react-icons/hi2";
import { UploadDocumentForm } from "@/components/patients/upload-document-form";
import { LinkDocumentForm } from "@/components/patients/add-document-form";
import { cn } from "@/lib/utils";

type Tab = "upload" | "link";

const TABS: { id: Tab; label: string; icon: typeof HiOutlineLink }[] = [
  { id: "upload", label: "Upload file", icon: HiOutlineArrowUpTray },
  { id: "link", label: "Paste link", icon: HiOutlineLink },
];

export interface AddDocumentPanelProps {
  patientId: string;
  /** False when file storage is not configured: only links can be added */
  uploadsEnabled: boolean;
}

/**
 * "Add document" button that opens a panel with two ways to add a document:
 * upload a file from the computer (default) or paste a link to one online.
 */
export function AddDocumentPanel({ patientId, uploadsEnabled }: AddDocumentPanelProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(uploadsEnabled ? "upload" : "link");
  // A new key after each save remounts the forms empty
  const [formKey, setFormKey] = useState(0);

  const close = () => setOpen(false);
  const done = () => {
    setOpen(false);
    setFormKey((k) => k + 1);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors"
      >
        <HiOutlinePlus aria-hidden="true" className="h-3.5 w-3.5" />
        Add document
      </button>
    );
  }

  const tabs = uploadsEnabled ? TABS : TABS.filter((t) => t.id === "link");

  return (
    <div className="w-full space-y-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
      {tabs.length > 1 && (
        <div role="tablist" aria-label="How to add the document" className="inline-flex rounded-md bg-slate-200/70 dark:bg-slate-800 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-semibold transition-colors",
                tab === id
                  ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      )}
      {tab === "upload" && uploadsEnabled ? (
        <UploadDocumentForm key={`u${formKey}`} patientId={patientId} onDone={done} onCancel={close} />
      ) : (
        <LinkDocumentForm key={`l${formKey}`} patientId={patientId} onDone={done} onCancel={close} />
      )}
    </div>
  );
}
