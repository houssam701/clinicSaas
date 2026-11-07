/**
 * Rules for patient document uploads, shared by the upload form (to warn
 * early) and the API (which enforces them). Change limits and file types here.
 */

/** Largest file a user may upload: 20 MB. */
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

/** How long an upload link stays valid. */
export const UPLOAD_URL_TTL_SECONDS = 10 * 60;

/** How long a link to open or download a file stays valid. */
export const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

/** Allowed content types, with the extensions that map to each and a short label. */
export const DOCUMENT_FILE_TYPES = {
  "application/pdf": { extensions: ["pdf"], label: "PDF" },
  "image/jpeg": { extensions: ["jpg", "jpeg"], label: "JPG" },
  "image/png": { extensions: ["png"], label: "PNG" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extensions: ["docx"],
    label: "Word",
  },
} as const satisfies Record<string, { extensions: readonly string[]; label: string }>;

export type DocumentMimeType = keyof typeof DOCUMENT_FILE_TYPES;

export const DOCUMENT_MIME_TYPES = Object.keys(DOCUMENT_FILE_TYPES) as DocumentMimeType[];

/** For <input type="file" accept>: ".pdf,.jpg,.jpeg,.png,.docx" plus the MIME types. */
export const DOCUMENT_ACCEPT = [
  ...Object.values(DOCUMENT_FILE_TYPES).flatMap((t) => t.extensions.map((e) => `.${e}`)),
  ...DOCUMENT_MIME_TYPES,
].join(",");

/** "PDF, JPG, PNG or Word" for help text. */
export const DOCUMENT_TYPES_LABEL = (() => {
  const labels = Object.values(DOCUMENT_FILE_TYPES).map((t) => t.label);
  return `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}`;
})();

export const isAllowedMimeType = (type: string): type is DocumentMimeType => type in DOCUMENT_FILE_TYPES;

const extensionOf = (fileName: string) => fileName.split(".").pop()?.toLowerCase() ?? "";

/**
 * The content type for a file: the browser's type when it is allowed,
 * otherwise from the extension (some browsers report "" for .docx).
 */
export function documentMimeType(fileName: string, browserType: string): DocumentMimeType | null {
  if (isAllowedMimeType(browserType)) return browserType;
  const ext = extensionOf(fileName);
  const match = DOCUMENT_MIME_TYPES.find((type) =>
    (DOCUMENT_FILE_TYPES[type].extensions as readonly string[]).includes(ext)
  );
  return match ?? null;
}

/** The main extension for a content type, used in storage keys. */
export const extensionFor = (type: DocumentMimeType) => DOCUMENT_FILE_TYPES[type].extensions[0];

/** "1.4 MB", "820 KB", "512 B" */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Folder in the bucket for one patient's files. Keys never contain the
 * original file name (that lives in the database), only a random id.
 */
export const patientDocumentsPrefix = (clinicId: string, patientId: string) =>
  `clinics/${clinicId}/patients/${patientId}/`;
