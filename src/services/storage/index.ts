import type { FileStorage } from "./file-storage";
import { S3FileStorage } from "./s3-storage";

export type { FileStorage, StoredObject } from "./file-storage";

/**
 * The app's file storage, configured only through provider-neutral
 * environment variables:
 *
 *   STORAGE_BUCKET             bucket name                       (required)
 *   STORAGE_ACCESS_KEY_ID      access key                        (required)
 *   STORAGE_SECRET_ACCESS_KEY  secret key                        (required)
 *   STORAGE_REGION             region; "auto" for R2             (default "auto")
 *   STORAGE_ENDPOINT           S3 endpoint; empty for AWS S3
 *   STORAGE_FORCE_PATH_STYLE   "true" for MinIO-style path URLs
 *
 * Switching providers means changing these values, not code.
 */

export class StorageNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`File storage is not configured (missing ${missing.join(", ")})`);
    this.name = "StorageNotConfiguredError";
  }
}

let instance: FileStorage | undefined;

/** The shared FileStorage. Throws StorageNotConfiguredError when settings are missing. */
export function getFileStorage(): FileStorage {
  if (instance) return instance;

  const env = process.env;
  const required = ["STORAGE_BUCKET", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY"] as const;
  const missing = required.filter((name) => !env[name]);
  if (missing.length > 0) throw new StorageNotConfiguredError(missing);

  instance = new S3FileStorage({
    bucket: env.STORAGE_BUCKET!,
    accessKeyId: env.STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY!,
    region: env.STORAGE_REGION || "auto",
    endpoint: env.STORAGE_ENDPOINT || undefined,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE === "true",
  });
  return instance;
}

/** True when the storage settings are present (the upload UI hides itself otherwise). */
export function isFileStorageConfigured(): boolean {
  return Boolean(process.env.STORAGE_BUCKET && process.env.STORAGE_ACCESS_KEY_ID && process.env.STORAGE_SECRET_ACCESS_KEY);
}

/**
 * Best-effort removal for cleanup after the database is already updated:
 * never throws (also when storage is not configured), only logs.
 */
export async function deleteStoredFilesQuietly(keys: string[], context: string): Promise<void> {
  if (keys.length === 0) return;
  try {
    await getFileStorage().delete(keys);
  } catch (error) {
    console.error(`[storage] could not delete ${keys.length} file(s) (${context})`, error);
  }
}
