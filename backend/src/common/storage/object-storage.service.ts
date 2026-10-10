import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";

export interface StoredObject {
  key: string;
  url: string;
}

/**
 * Object storage abstraction.
 *
 * Primary backend: Cloudflare R2 (S3-compatible API). Fallback: local disk
 * under `<cwd>/uploads` so local development and CI keep working without R2
 * credentials — the previous behavior, minus the production-fatal property that
 * uploads vanish on every deploy/restart (ephemeral container filesystem).
 *
 * ENV (all optional; the service degrades to local disk when incomplete):
 *   R2_ACCOUNT_ID             -> endpoint https://<account>.r2.cloudflarestorage.com
 *   R2_ACCESS_KEY_ID          R2 API-token access key id
 *   R2_SECRET_ACCESS_KEY      R2 API-token secret
 *   R2_BUCKET                 bucket name (e.g. sentinelfi-uploads)
 *   R2_ENDPOINT               override endpoint (defaults to the account-id form)
 *   R2_REGION                 default "auto"
 *   R2_PUBLIC_BASE_URL        optional public domain; when set, put() returns
 *                             <base>/<key> instead of the raw key
 */
@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicBaseUrl?: string;
  private readonly localRoot = path.join(process.cwd(), "uploads");

  constructor(configService: ConfigService) {
    const accountId = configService.get<string>("R2_ACCOUNT_ID");
    const accessKeyId = configService.get<string>("R2_ACCESS_KEY_ID");
    const secretAccessKey = configService.get<string>("R2_SECRET_ACCESS_KEY");
    this.bucket = configService.get<string>("R2_BUCKET") || "";
    this.publicBaseUrl =
      configService.get<string>("R2_PUBLIC_BASE_URL") || undefined;

    const endpoint =
      configService.get<string>("R2_ENDPOINT") ||
      (accountId
        ? `https://${accountId}.r2.cloudflarestorage.com`
        : undefined);

    if (endpoint && accessKeyId && secretAccessKey && this.bucket) {
      this.client = new S3Client({
        region: configService.get<string>("R2_REGION") || "auto",
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
      });
    } else {
      this.client = null;
      this.logger.warn(
        "R2 object storage is not configured (missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET). " +
          "Uploads fall back to local disk (uploads/). Set the R2_* variables in production.",
      );
    }
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  async put(
    key: string,
    body: Buffer,
    contentType?: string,
  ): Promise<StoredObject> {
    if (this.client) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      return {
        key,
        url: this.publicBaseUrl ? `${this.publicBaseUrl}/${key}` : key,
      };
    }

    const full = path.join(this.localRoot, key);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, body);
    return { key, url: `/uploads/${key}` };
  }

  async get(keyOrUrl: string): Promise<Buffer> {
    const key = this.normalizeKey(keyOrUrl);
    if (this.client) {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const bytes = await res.Body!.transformToByteArray();
      return Buffer.from(bytes);
    }
    return fs.promises.readFile(path.join(this.localRoot, key));
  }

  async delete(keyOrUrl: string): Promise<void> {
    const key = this.normalizeKey(keyOrUrl);
    if (this.client) {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return;
    }
    try {
      await fs.promises.unlink(path.join(this.localRoot, key));
    } catch (error: any) {
      // Already absent — nothing to clean up.
      if (error?.code !== "ENOENT") throw error;
    }
  }

  /**
   * Accepts a raw key, a legacy local URL ("/uploads/..."), or a stored public
   * URL and returns the object key for the active backend.
   */
  private normalizeKey(keyOrUrl: string): string {
    const withoutOrigin = keyOrUrl.replace(/^[a-z]+:\/\/[^/]+/i, "");
    return withoutOrigin
      .replace(/^\/?uploads\//, "")
      .replace(/^(\.\/)?uploads\//, "")
      .replace(/^\//, "");
  }
}