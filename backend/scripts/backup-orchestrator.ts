import { exec } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

const execAsync = promisify(exec);

dotenv.config({
  path: [
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '../.env'),
  ],
});

const LOCAL_RETENTION_DAYS = Number(process.env.BACKUP_LOCAL_RETENTION_DAYS || 7);
const REMOTE_RETENTION_DAYS = Number(process.env.BACKUP_REMOTE_RETENTION_DAYS || 30);
const REMOTE_PREFIX = process.env.BACKUP_REMOTE_PREFIX || 'db-backups/';

function buildR2Client(): { client: S3Client; bucket: string } | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const endpoint =
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  const client = new S3Client({
    region: process.env.R2_REGION || 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  return { client, bucket };
}

async function uploadFile(
  r2: { client: S3Client; bucket: string },
  localPath: string,
): Promise<string> {
  const key = `${REMOTE_PREFIX}${path.basename(localPath)}`;
  const body = fs.readFileSync(localPath);
  await r2.client.send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: body,
      ContentType: localPath.endsWith('.dump')
        ? 'application/octet-stream'
        : 'application/sql',
    }),
  );
  console.log(`[BACKUP OFFSITE] Uploaded ${key} (${body.length} bytes)`);
  return key;
}

async function pruneRemote(r2: { client: S3Client; bucket: string }): Promise<void> {
  const cutoff = Date.now() - REMOTE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const listed = await r2.client.send(
    new ListObjectsV2Command({ Bucket: r2.bucket, Prefix: REMOTE_PREFIX }),
  );
  const stale = (listed.Contents || [])
    .filter((obj) => obj.Key && obj.LastModified && obj.LastModified.getTime() < cutoff)
    .map((obj) => ({ Key: obj.Key as string }));

  if (stale.length === 0) return;

  await r2.client.send(
    new DeleteObjectsCommand({
      Bucket: r2.bucket,
      Delete: { Objects: stale, Quiet: true },
    }),
  );
  console.log(`[BACKUP OFFSITE] Pruned ${stale.length} object(s) older than ${REMOTE_RETENTION_DAYS}d`);
}

async function runBackup() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[BACKUP ERROR] DATABASE_URL not found in environment.');
    process.exit(1);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const r2 = buildR2Client();
  if (!r2) {
    const message =
      'R2 off-site backup target is not configured (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET).';
    if (isProduction || process.env.BACKUP_REQUIRE_OFFSITE === 'true') {
      console.error(`[BACKUP ERROR] ${message} Refusing to run without off-site durability.`);
      process.exit(1);
    }
    console.warn(`[BACKUP WARN] ${message} Continuing with LOCAL-ONLY backup (non-production).`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../../backups');
  const baseName = `sentinelfi-db-backup-${timestamp}`;
  const sqlFile = path.join(backupDir, `${baseName}.sql`);
  const dumpFile = path.join(backupDir, `${baseName}.dump`);

  fs.mkdirSync(backupDir, { recursive: true });

  try {
    await execAsync(`pg_dump "${dbUrl}" --no-owner --no-acl -f "${sqlFile}"`);
    console.log(`[BACKUP] Plain SQL written: ${sqlFile}`);
    await execAsync(`pg_dump "${dbUrl}" --no-owner --no-acl -Fc -f "${dumpFile}"`);
    console.log(`[BACKUP] Custom-format dump written: ${dumpFile}`);
  } catch (error: any) {
    console.error(`[BACKUP FAILED] pg_dump error: ${error.message}`);
    process.exit(1);
  }

  if (r2) {
    try {
      await uploadFile(r2, sqlFile);
      await uploadFile(r2, dumpFile);
      await pruneRemote(r2);
    } catch (error: any) {
      console.error(`[BACKUP FAILED] Off-site upload error: ${error.message}`);
      process.exit(1);
    }
  }

  const cutoff = Date.now() - LOCAL_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const file of fs.readdirSync(backupDir)) {
    if (!file.endsWith('.sql') && !file.endsWith('.dump')) continue;
    const filePath = path.join(backupDir, file);
    if (fs.statSync(filePath).mtimeMs < cutoff) {
      fs.unlinkSync(filePath);
      console.log(`[BACKUP CLEANUP] Removed old local backup: ${file}`);
    }
  }

  console.log('[BACKUP OK] Backup completed successfully.');
}

runBackup().catch((error: any) => {
  console.error(`[BACKUP FAILED] Unhandled error: ${error?.message || error}`);
  process.exit(1);
});
