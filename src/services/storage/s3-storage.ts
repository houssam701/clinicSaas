import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { FileStorage, StoredObject } from "./file-storage";

export interface S3StorageConfig {
  bucket: string;
  region: string;
  /** Empty for AWS S3; the provider's S3 endpoint otherwise (R2, MinIO, ...) */
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Path-style URLs (endpoint/bucket/key), needed by MinIO and some self-hosted stores */
  forcePathStyle?: boolean;
}

/** A Content-Disposition value that keeps non-ASCII file names (RFC 6266 / 5987). */
function contentDisposition(disposition: "inline" | "attachment", fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/**
 * FileStorage over the standard S3 API. It only uses features every
 * S3-compatible provider supports (presigned PUT/GET, HEAD, multi-delete),
 * so it holds no provider-specific logic.
 */
export class S3FileStorage implements FileStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint || undefined,
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      // Some S3-compatible stores reject the SDK's default CRC checksums on presigned uploads
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  createUploadUrl({ key, contentType, expiresInSeconds }: { key: string; contentType: string; expiresInSeconds: number }) {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      // Sign Content-Type too (by default only "host" is signed), so storage
      // refuses an upload sent with any other type than the one approved
      { expiresIn: expiresInSeconds, signableHeaders: new Set(["content-type"]) }
    );
  }

  createDownloadUrl({
    key,
    fileName,
    contentType,
    disposition,
    expiresInSeconds,
  }: {
    key: string;
    fileName: string;
    contentType?: string;
    disposition: "inline" | "attachment";
    expiresInSeconds: number;
  }) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: contentDisposition(disposition, fileName),
        ResponseContentType: contentType,
        ResponseCacheControl: "private, no-store",
      }),
      { expiresIn: expiresInSeconds }
    );
  }

  async stat(key: string): Promise<StoredObject | null> {
    try {
      const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { size: head.ContentLength ?? 0, contentType: head.ContentType };
    } catch (error) {
      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) return null;
      throw error;
    }
  }

  async delete(keys: string[]): Promise<void> {
    // DeleteObjects takes at most 1000 keys per call
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000);
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        })
      );
    }
  }
}
