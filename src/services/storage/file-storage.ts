/**
 * What the app needs from file storage, and nothing more.
 *
 * Every caller depends on this interface, never on a provider SDK, so the
 * bucket can move between Cloudflare R2, AWS S3, MinIO or any other
 * S3-compatible store by changing configuration only. See ./index.ts.
 */

export interface StoredObject {
  /** Size in bytes, as recorded by the store */
  size: number;
  /** Content type, as recorded by the store */
  contentType: string | undefined;
}

export interface FileStorage {
  /**
   * A short-lived URL the browser can PUT one file to. The upload must send
   * exactly `contentType` as its Content-Type header.
   */
  createUploadUrl(input: { key: string; contentType: string; expiresInSeconds: number }): Promise<string>;

  /**
   * A short-lived URL to read one file. `disposition` decides whether the
   * browser shows it (inline) or saves it (attachment) under `fileName`.
   */
  createDownloadUrl(input: {
    key: string;
    fileName: string;
    contentType?: string;
    disposition: "inline" | "attachment";
    expiresInSeconds: number;
  }): Promise<string>;

  /** The object's size and type, or null when nothing is stored under `key`. */
  stat(key: string): Promise<StoredObject | null>;

  /** Deletes the objects; keys that do not exist are ignored. */
  delete(keys: string[]): Promise<void>;
}
