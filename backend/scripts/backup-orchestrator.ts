import { exec } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function runBackup() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[BACKUP ERROR] DATABASE_URL not found in environment.');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../../backups');
  const backupFile = path.join(backupDir, `sentinelfi-db-backup-${timestamp}.sql`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`[BACKUP] Starting enterprise backup to: ${backupFile}`);

  try {
    // Note: pg_dump must be in the PATH
    // Use the URL format directly for convenience
    await execAsync(`pg_dump "${dbUrl}" -f "${backupFile}"`);
    
    // Optional: Log success into a master audit table (if we had one for system events)
    console.log(`[BACKUP SUCCESS] Backup completed successfully: ${backupFile}`);
    
    // Retention Policy: Delete backups older than 7 days
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > SEVEN_DAYS_MS) {
        fs.unlinkSync(filePath);
        console.log(`[BACKUP CLEANUP] Removed old backup: ${file}`);
      }
    }
  } catch (error: any) {
    console.error(`[BACKUP FAILED] Error during pg_dump: ${error.message}`);
    // In a real enterprise setup, this would trigger a PagerDuty/Slack alert
    process.exit(1);
  }
}

runBackup();
