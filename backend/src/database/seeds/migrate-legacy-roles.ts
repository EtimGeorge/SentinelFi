// backend/src/database/seeds/migrate-legacy-roles.ts
// ============================================================
// ROLE MIGRATION SCRIPT: Legacy → Enterprise Hierarchy
// ============================================================
// Usage:
//   Dry-run (default):  ts-node -r tsconfig-paths/register src/database/seeds/migrate-legacy-roles.ts
//   Execute:            ts-node -r tsconfig-paths/register src/database/seeds/migrate-legacy-roles.ts --execute
// ============================================================

import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import AppDataSource from '../../../ormconfig';
import * as fs from 'fs';
import * as path from 'path';

// ── Role Mapping ──────────────────────────────────────────
// Legacy Role Name (string in DB) → New Role Name (string in DB)
const ROLE_MIGRATION_MAP: Record<string, string> = {
  'Admin': 'Admin Director',
  'Finance': 'Finance Manager',
  'IT Head': 'Technical Director',
};

interface MigrationAction {
  userId: string;
  userEmail: string;
  tenantId: string | null;
  legacyRoleName: string;
  legacyRoleId: string;
  newRoleName: string;
  newRoleId: string;
}

async function migrate() {
  const logger = new Logger('MigrateLegacyRoles');
  const isExecute = process.argv.includes('--execute');

  logger.log('═══════════════════════════════════════════════════════');
  logger.log('  ROLE MIGRATION: Legacy → Enterprise Hierarchy');
  logger.log(`  Mode: ${isExecute ? '🔴 EXECUTE (changes WILL be applied)' : '🟢 DRY-RUN (no changes will be made)'}`);
  logger.log('═══════════════════════════════════════════════════════');

  // ── 1. Initialize DataSource ────────────────────────────
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const dataSource = AppDataSource;

  try {
    // ── 2. Pre-flight: Verify new roles exist ──────────────
    logger.log('\n[Pre-flight] Verifying new Enterprise roles exist in the database...');

    const newRoleNames = Object.values(ROLE_MIGRATION_MAP);
    const existingNewRoles: { id: string; name: string }[] = await dataSource.query(
      `SELECT id, name FROM public.roles WHERE name = ANY($1)`,
      [newRoleNames]
    );

    const missingRoles = newRoleNames.filter(
      name => !existingNewRoles.some(r => r.name === name)
    );

    if (missingRoles.length > 0) {
      logger.error(`❌ Missing Enterprise roles in DB: ${missingRoles.join(', ')}`);
      logger.error('   Please run the role seeder first:');
      logger.error('   ts-node -r tsconfig-paths/register src/database/seeds/seed-roles-permissions.ts');
      process.exit(1);
    }

    logger.log(`✅ All ${existingNewRoles.length} target roles verified.`);

    // Build lookup maps
    const newRoleMap = new Map(existingNewRoles.map(r => [r.name, r.id]));

    // ── 3. Fetch legacy roles ──────────────────────────────
    const legacyRoleNames = Object.keys(ROLE_MIGRATION_MAP);
    const legacyRoles: { id: string; name: string }[] = await dataSource.query(
      `SELECT id, name FROM public.roles WHERE name = ANY($1)`,
      [legacyRoleNames]
    );

    if (legacyRoles.length === 0) {
      logger.log('ℹ️  No legacy roles found in the database. Nothing to migrate.');
      return;
    }

    const legacyRoleMap = new Map(legacyRoles.map(r => [r.name, r.id]));
    logger.log(`Found ${legacyRoles.length} legacy roles: ${legacyRoles.map(r => r.name).join(', ')}`);

    // ── 4. Find all users with legacy roles ────────────────
    const usersWithLegacyRoles: {
      user_id: string;
      email: string;
      tenant_id: string | null;
      role_id: string;
      role_name: string;
    }[] = await dataSource.query(`
      SELECT 
        u.id as user_id,
        u.email,
        u.tenant_id,
        r.id as role_id,
        r.name as role_name
      FROM public."user" u
      INNER JOIN public.user_roles ur ON ur.user_id = u.id
      INNER JOIN public.roles r ON r.id = ur.role_id
      WHERE r.name = ANY($1)
      ORDER BY u.tenant_id, u.created_at ASC
    `, [legacyRoleNames]);

    if (usersWithLegacyRoles.length === 0) {
      logger.log('ℹ️  No users with legacy roles found. Nothing to migrate.');
      return;
    }

    logger.log(`\nFound ${usersWithLegacyRoles.length} user-role assignments to migrate:\n`);

    // ── 5. Plan migration actions ──────────────────────────
    const actions: MigrationAction[] = [];
    const skipped: { userEmail: string; roleName: string; reason: string }[] = [];

    for (const userRole of usersWithLegacyRoles) {
      const newRoleName = ROLE_MIGRATION_MAP[userRole.role_name];
      if (!newRoleName) {
        skipped.push({
          userEmail: userRole.email,
          roleName: userRole.role_name,
          reason: 'No mapping defined',
        });
        continue;
      }

      const newRoleId = newRoleMap.get(newRoleName);
      if (!newRoleId) {
        skipped.push({
          userEmail: userRole.email,
          roleName: userRole.role_name,
          reason: `Target role "${newRoleName}" not found in DB`,
        });
        continue;
      }

      // Check if user already has the new role
      const existingAssignment = await dataSource.query(
        `SELECT 1 FROM public.user_roles WHERE user_id = $1 AND role_id = $2`,
        [userRole.user_id, newRoleId]
      );

      if (existingAssignment.length > 0) {
        skipped.push({
          userEmail: userRole.email,
          roleName: userRole.role_name,
          reason: `Already has "${newRoleName}"`,
        });
        continue;
      }

      actions.push({
        userId: userRole.user_id,
        userEmail: userRole.email,
        tenantId: userRole.tenant_id,
        legacyRoleName: userRole.role_name,
        legacyRoleId: userRole.role_id,
        newRoleName,
        newRoleId,
      });
    }

    // ── 6. Display planned changes ─────────────────────────
    logger.log('┌──────────────────────────────────────────────────────────────┐');
    logger.log('│                    MIGRATION PLAN                            │');
    logger.log('├──────────────────────────────────────────────────────────────┤');

    // Group by tenant for clean display
    const byTenant = new Map<string, MigrationAction[]>();
    for (const action of actions) {
      const key = action.tenantId || 'NO_TENANT (Platform User)';
      if (!byTenant.has(key)) byTenant.set(key, []);
      byTenant.get(key)!.push(action);
    }

    for (const [tenantId, tenantActions] of byTenant) {
      logger.log(`│  Tenant: ${tenantId}`);
      for (const a of tenantActions) {
        logger.log(`│    ${a.userEmail}: "${a.legacyRoleName}" → "${a.newRoleName}"`);
      }
      logger.log('│');
    }

    if (skipped.length > 0) {
      logger.log('│  ── Skipped ──');
      for (const s of skipped) {
        logger.log(`│    ${s.userEmail}: "${s.roleName}" — ${s.reason}`);
      }
    }

    logger.log('├──────────────────────────────────────────────────────────────┤');
    logger.log(`│  Total to migrate: ${actions.length}`);
    logger.log(`│  Skipped: ${skipped.length}`);
    logger.log('└──────────────────────────────────────────────────────────────┘');

    if (actions.length === 0) {
      logger.log('\n✅ All users already have their Enterprise roles. Nothing to do.');
      return;
    }

    // ── 7. Generate Rollback SQL ───────────────────────────
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rollbackFileName = `rollback-roles-${timestamp}.sql`;
    const rollbackPath = path.join(__dirname, rollbackFileName);

    let rollbackSql = `-- Rollback Script: Undo Role Migration (Generated: ${new Date().toISOString()})\n`;
    rollbackSql += `-- Run with: psql -f ${rollbackFileName}\n\n`;
    rollbackSql += `BEGIN;\n\n`;

    for (const action of actions) {
      rollbackSql += `-- Undo: ${action.userEmail} "${action.legacyRoleName}" → "${action.newRoleName}"\n`;
      rollbackSql += `DELETE FROM public.user_roles WHERE user_id = '${action.userId}' AND role_id = '${action.newRoleId}';\n\n`;
    }

    rollbackSql += `COMMIT;\n`;
    rollbackSql += `-- End of rollback script\n`;

    fs.writeFileSync(rollbackPath, rollbackSql, 'utf8');
    logger.log(`\n📄 Rollback script generated: ${rollbackPath}`);

    // ── 8. Execute (if --execute flag passed) ──────────────
    if (!isExecute) {
      logger.log('\n🟢 DRY-RUN complete. No changes were made.');
      logger.log('   To apply changes, re-run with: --execute');
      return;
    }

    logger.log('\n🔴 EXECUTING migration...');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let migrated = 0;
      for (const action of actions) {
        await queryRunner.query(
          `INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2)`,
          [action.userId, action.newRoleId]
        );
        migrated++;
        logger.log(`  ✅ ${action.userEmail}: Added "${action.newRoleName}"`);
      }

      await queryRunner.commitTransaction();
      logger.log(`\n🎉 Migration complete! ${migrated} role assignments added.`);
      logger.log('   Legacy roles are still in place (additive migration).');
      logger.log('   Users now have BOTH legacy and new roles for backward compatibility.');

    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      logger.error(`\n❌ Migration failed! Transaction rolled back.`);
      logger.error(`   Error: ${error.message}`);
      logger.error(`   You can also use the rollback script: ${rollbackPath}`);
      throw error;
    } finally {
      await queryRunner.release();
    }

    // ── 9. Post-migration report ───────────────────────────
    logger.log('\n── Post-Migration Report ──');

    const roleDistribution: { role_name: string; user_count: string }[] = await dataSource.query(`
      SELECT r.name as role_name, COUNT(ur.user_id)::text as user_count
      FROM public.roles r
      LEFT JOIN public.user_roles ur ON ur.role_id = r.id
      GROUP BY r.name
      ORDER BY COUNT(ur.user_id) DESC
    `);

    logger.log('Role Distribution:');
    for (const row of roleDistribution) {
      const count = parseInt(row.user_count, 10);
      if (count > 0) {
        logger.log(`  ${row.role_name}: ${count} user(s)`);
      }
    }

  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      logger.log('\nDataSource destroyed. Done.');
    }
  }
}

// ── Entry Point ─────────────────────────────────────────────
migrate().catch(error => {
  const logger = new Logger('MigrateLegacyRoles');
  logger.error('❌ Migration script failed', error);
  process.exit(1);
});
