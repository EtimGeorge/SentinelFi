import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Logger } from '@nestjs/common';
import { SuperAdminService } from '../src/superadmin/superadmin.service';
import { AuthService } from '../src/auth/auth.service';
import { Role } from '@shared/types/role.enum';
import { UserEntity } from '../src/auth/user.entity';
import * as bcrypt from 'bcryptjs';

async function setupTestTenants() {
  const logger = new Logger('SetupTestTenantsScript');
  logger.log('Starting setup of test tenants and users...');

  // Create a NestJS application context to access DI container
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error', 'debug', 'verbose'],
  });

  // Declare resolved services outside try block for finally to access
  let superAdminService: SuperAdminService;
  let authService: AuthService;

  try {
    // RESOLVE scoped providers
    superAdminService = await app.resolve(SuperAdminService);
    authService = await app.resolve(AuthService);

    // --- Tenant 1: SOLUTION_ENERGY (seesl_schema) ---
    const tenant1Name = 'SOLUTION_ENERGY';
    const tenant1Email = 'saencrystal.global@gmail.com';
    const tenant1Password = 'TestPass2026!Solar';

    logger.log(`Setting up Tenant 1: ${tenant1Name}`);
    let tenant1 = await superAdminService.findAllTenants({ name: tenant1Name }).then(res => res.data[0]);

    if (!tenant1) {
      logger.log(`Tenant ${tenant1Name} not found, creating...`);
      // createTenant now handles schema creation AND migrations internally
      tenant1 = await superAdminService.createTenant({
        name: tenant1Name,
        admin_email: tenant1Email,
        is_active: true,
        plan: 'premium',
      });
      logger.log(`✅ Tenant ${tenant1Name} created with schema and migrations (ID: ${tenant1.tenant_id})`);
    } else {
      logger.log(`Tenant ${tenant1Name} already exists (ID: ${tenant1.tenant_id}).`);
      // Migrations were already run during tenant creation
    }

    logger.log(`Creating/Updating admin user for Tenant 1: ${tenant1Email}`);
    try {
      const admin1 = await authService.createUser(
        { // Mock UserPayload for requesting user (SuperAdmin)
          id: 'script-superadmin', email: 'script@example.com', roles: [{id: 's', name: Role.SuperAdmin, description: ''}], permissions: [], tenant_id: null, is_active: true
        },
        {
          email: tenant1Email,
          password: tenant1Password,
          first_name: 'Tenant1',
          last_name: 'Admin',
          role: Role.Admin, // Assign 'Admin' role using RBAC
          tenant_id: tenant1.tenant_id,
          is_active: true,
        },
      );
      logger.log(`✅ Admin user ${admin1.email} for Tenant 1 created. Password: ${tenant1Password}`);
    } catch (err: any) {
      if (err.status === 409) {
        logger.log(`Admin user ${tenant1Email} already exists for Tenant 1. Updating password...`);
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(tenant1Password, salt);
        await app.get(AuthService)['dataSource'].getRepository(UserEntity).update(
          { email: tenant1Email },
          { password_hash }
        );
        logger.log(`✅ Admin user ${tenant1Email} for Tenant 1 password updated.`);
      } else {
        throw err;
      }
    }


    // --- Tenant 2: SAENCRYSTAL_GLOBAL_SERVICES (sgs_schema) ---
    const tenant2Name = 'SAENCRYSTAL_GLOBAL_SERVICES';
    const tenant2Email = 'saencrystal@gmail.com';
    const tenant2Password = 'TestPass2026!Crystal';

    logger.log(`\nSetting up Tenant 2: ${tenant2Name}`);
    let tenant2 = await superAdminService.findAllTenants({ name: tenant2Name }).then(res => res.data[0]);

    if (!tenant2) {
      logger.log(`Tenant ${tenant2Name} not found, creating...`);
      // createTenant now handles schema creation AND migrations internally
      tenant2 = await superAdminService.createTenant({
        name: tenant2Name,
        admin_email: tenant2Email,
        is_active: true,
        plan: 'basic',
      });
      logger.log(`✅ Tenant ${tenant2Name} created with schema and migrations (ID: ${tenant2.tenant_id})`);
    } else {
      logger.log(`Tenant ${tenant2Name} already exists (ID: ${tenant2.tenant_id}).`);
    }

    try {
      const admin2 = await authService.createUser(
        { // Mock UserPayload for requesting user (SuperAdmin)
          id: 'script-superadmin', email: 'script@example.com', roles: [{id: 's', name: Role.SuperAdmin, description: ''}], permissions: [], tenant_id: null, is_active: true
        },
        {
          email: tenant2Email,
          password: tenant2Password,
          first_name: 'Tenant2',
          last_name: 'Admin',
          role: Role.Admin, // Assign 'Admin' role using RBAC
          tenant_id: tenant2.tenant_id,
          is_active: true,
        },
      );
      logger.log(`✅ Admin user ${admin2.email} for Tenant 2 created. Password: ${tenant2Password}`);
    } catch (err: any) {
      if (err.status === 409) {
        logger.log(`Admin user ${tenant2Email} already exists for Tenant 2. Updating password...`);
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(tenant2Password, salt);
        await app.get(AuthService)['dataSource'].getRepository(UserEntity).update(
          { email: tenant2Email },
          { password_hash }
        );
        logger.log(`✅ Admin user ${tenant2Email} for Tenant 2 password updated.`);
      } else {
        throw err;
      }
    }

    logger.log('\n=== Test Credentials Ready ===');
    logger.log(`Tenant 1 (${tenant1Name}): ${tenant1Email} / ${tenant1Password}`);
    logger.log(`Tenant 2 (${tenant2Name}): ${tenant2Email} / ${tenant2Password}`);
    logger.log('===============================\n');

  } catch (error) {
    logger.error('❌ Failed to setup test tenants:', error);
    process.exit(1);
  } finally {
    await app.close(); // app.close() handles releasing resolved instances
    process.exit(0);
  }
}

setupTestTenants();