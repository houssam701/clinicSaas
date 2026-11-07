"use client";

import React, { useRef, useState } from "react";
import { HiOutlineArrowUpTray, HiOutlineDocument, HiXMark } from "react-icons/hi2";
import { requestDocumentUploadAction } from "@/actions/request-document-upload";
import { saveUploadedDocumentAction } from "@/actions/save-uploaded-document";
import { FieldError, FormAlert, inputClass, labelClass } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DOCUMENT_TYPE_OPTIONS } from "@/types/patients";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_TYPES_LABEL,
  MAX_DOCUMENT_BYTES,
  documentMimeType,
  formatBytes,
  type DocumentMimeType,
} from "@/config/documents";
import { cn } from "@/lib/utils";

type Phase = "idle" | "uploading" | "saving";

/** PUTs the file to the signed link and reports progress (fetch has no upload progress). */
function putFile(url: string, file: File, headers: Record<string, string>, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`status ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

/** "Report 2026.pdf" → "Report 2026" */
const baseName = (fileName: string) => fileName.replace(/\.[^.]+$/, "");

export interface UploadDocumentFormProps {
  patientId: string;
  /** Called after the document is saved */
  onDone: () => void;
  onCancel: () => void;
}

/**
 * Uploads a file from the user's computer as a patient document:
 *   1. asks the API for a short-lived upload link (access and type/size checked),
 *   2. sends the file straight to storage with a progress bar,
 *   3. asks the API to save the document (it re-checks the stored file).
 * The "Upload file" tab of AddDocumentPanel.
 */
export function UploadDocumentForm({ patientId, onDone, onCancel }: UploadDocumentFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ file: File; type: DocumentMimeType } | null>(null);
  const [name, setName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [nameError, setNameError] = useState<string[]>();
  const [dragging, setDragging] = useState(false);

  const busy = phase !== "idle";

  const choose = (picked: File | undefined) => {
    setError(undefined);
    if (!picked) return;
    const type = documentMimeType(picked.name, picked.type);
    if (!type) return setError(`This file type is not allowed. Upload a ${DOCUMENT_TYPES_LABEL} file.`);
    if (picked.size > MAX_DOCUMENT_BYTES) {
      return setError(`This file is ${formatBytes(picked.size)}. Files can be at most ${formatBytes(MAX_DOCUMENT_BYTES)}.`);
    }
    if (picked.size === 0) return setError("This file is empty.");
    setFile({ file: picked, type });
    if (!name) setName(baseName(picked.name));
  };

  const clearFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setNameError(undefined);
    if (!file) return setError("Choose a file to upload.");
    if (!name.trim()) return setNameError(["Document name is required."]);

    setPhase("uploading");
    setProgress(0);
    const step1 = await requestDocumentUploadAction(patientId, {
      file_name: file.file.name,
      mime_type: file.type,
      size_bytes: file.file.size,
    });
    if (!step1.ticket) {
      setPhase("idle");
      return setError(step1.error);
    }

    try {
      await putFile(step1.ticket.upload_url, file.file, step1.ticket.headers, setProgress);
    } catch {
      setPhase("idle");
      return setError("The upload failed. Check your connection and try again.");
    }

    setPhase("saving");
    const step2 = await saveUploadedDocumentAction(patientId, {
      name: name.trim(),
      document_type: documentType,
      storage_key: step1.ticket.storage_key,
      file_name: file.file.name,
    });
    setPhase("idle");
    if (step2.saved) return onDone();
    setError(step2.error);
    setNameError(step2.fieldErrors?.name);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormAlert>{error}</FormAlert>

      {/* File picker / drop zone */}
      {file ? (
        <div className="flex items-center gap-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
          <HiOutlineDocument aria-hidden="true" className="h-8 w-8 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{file.file.name}</p>
            <p className="text-xs text-slate-500">{formatBytes(file.file.size)}</p>
            {busy && (
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                role="progressbar"
                aria-label="Upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={phase === "saving" ? 100 : progress}
              >
                <div
                  className="h-full origin-left rounded-full bg-primary transition-transform duration-200"
                  style={{ transform: `scaleX(${(phase === "saving" ? 100 : progress) / 100})` }}
                />
              </div>
            )}
          </div>
          {!busy && (
            <button
              type="button"
              onClick={clearFile}
              aria-label={`Remove ${file.file.name}`}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <HiXMark aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <label
          htmlFor="upload-file"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            choose(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary/50 hover:bg-primary/5"
          )}
        >
          <HiOutlineArrowUpTray aria-hidden="true" className="h-7 w-7 text-primary" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Choose a file <span className="font-normal text-slate-500">or drag it here</span>
          </span>
          <span className="text-xs text-slate-500">
            {DOCUMENT_TYPES_LABEL}, up to {formatBytes(MAX_DOCUMENT_BYTES)}
          </span>
        </label>
      )}
      <input
        ref={inputRef}
        id="upload-file"
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="sr-only"
        onChange={(e) => choose(e.target.files?.[0])}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="upload-name" className={labelClass}>
            Name
          </label>
          <input
            id="upload-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            placeholder="Document name"
            aria-invalid={!!nameError || undefined}
            aria-describedby={nameError ? "upload-name-error" : undefined}
            className={inputClass(!!nameError)}
          />
          <FieldError id="upload-name-error" messages={nameError} />
        </div>
        <div>
          <label htmlFor="upload-type" className={labelClass}>
            Type <span className="ml-1 font-medium text-slate-400">(optional)</span>
          </label>
          <Select id="upload-type" value={documentType} onChange={(e) => setDocumentType(e.target.value)} disabled={busy}>
            <option value="">No type</option>
            {DOCUMENT_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={busy}
          loadingText={phase === "saving" ? "Saving..." : `Uploading ${progress}%`}
        >
          Upload
        </Button>
      </div>
    </form>
  );
}
