// backend/src/database/seeds/seed-roles-permissions.ts
// Instruction: Refactor the script to initialize TypeORM DataSource directly instead of creating a full NestJS app context.
// Remove NestFactory and AppModule imports.
// Update the bootstrap function to directly initialize and use the TypeORM DataSource.
// Ensure correct `AppDataSource` import.

import { DataSource } from 'typeorm'; // Import DataSource directly
import { RoleEntity } from '../../auth/role.entity';
import { PermissionEntity } from '../../auth/permission.entity';
import { Logger } from '@nestjs/common'; // Keep Logger, it's a simple class, though a plain console.log might be faster
import { Role } from '@shared/types/role.enum'; // Import the shared Role enum
// Removed: import { NestFactory } from '@nestjs/core';
// Removed: import { AppModule } from '../../app.module';

import AppDataSource from '../../../ormconfig'; // Import the default public AppDataSource from monorepo root config

async function bootstrap() {
    const logger = new Logger('SeedRolesPermissions');
    logger.log('Initializing TypeORM DataSource directly for seeding roles and permissions...');
    
    // Initialize DataSource directly
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }
    const dataSource = AppDataSource; // Use the initialized DataSource
  
    const roleRepository = dataSource.getRepository(RoleEntity);
    const permissionRepository = dataSource.getRepository(PermissionEntity);
  
    // Define Permissions
    const permissionsData = [
      // User Management
      { name: 'users:create', description: 'Create new user accounts' },
      { name: 'users:read', description: 'View user profiles and lists' },
      { name: 'users:update', description: 'Update user profiles and roles' },
      { name: 'users:delete', description: 'Deactivate or delete user accounts' },
      { name: 'users:assign_roles', description: 'Assign roles to users' },

      // Role Management (SuperAdmin only)
      { name: 'roles:create', description: 'Create new roles' },
      { name: 'roles:read', description: 'View role definitions' },
      { name: 'roles:update', description: 'Update role definitions and permissions' },
      { name: 'roles:delete', description: 'Delete roles' },

      // Project Management
      { name: 'projects:create', description: 'Create new projects' },
      { name: 'projects:read', description: 'View project details' },
      { name: 'projects:update', description: 'Update project details' },
      { name: 'projects:delete', description: 'Delete projects' },

      // WBS Management (Budgeting)
      { name: 'wbs:create', description: 'Create WBS categories and line items' },
      { name: 'wbs:read', description: 'View WBS structures and budgets' },
      { name: 'wbs:update', description: 'Update WBS structures and budgets' },
      { name: 'wbs:delete', description: 'Delete WBS categories and line items' },

      // Expense Management
      { name: 'expenses:create', description: 'Create new expense entries' },
      { name: 'expenses:read', description: 'View expense entries' },
      { name: 'expenses:update', description: 'Update own or assigned expense entries' },
      { name: 'expenses:approve', description: 'Approve or reject expense entries' },
      { name: 'expenses:delete', description: 'Delete expense entries' },

      // Operational Budgets
      { name: 'operational_budgets:create', description: 'Create operational budgets' },
      { name: 'operational_budgets:read', description: 'View operational budgets' },
      { name: 'operational_budgets:update', description: 'Update operational budgets' },
      { name: 'operational_budgets:delete', description: 'Delete operational budgets' },

      // Reporting & Analytics
      { name: 'reports:read', description: 'View various reports and analytics' },
      { name: 'reports:export', description: 'Export report data' },

      // Tenant Settings Management
      { name: 'tenant_settings:read', description: 'View tenant-specific settings' },
      { name: 'tenant_settings:update', description: 'Update tenant-specific settings' },

      // SuperAdmin Specific (Platform-level operations)
      { name: 'superadmin:manage_tenants', description: 'Create, update, delete tenants (platform-level)' },
      { name: 'superadmin:impersonate', description: 'Impersonate tenant users for support' },
      { name: 'superadmin:view_all_data', description: 'View data across all tenants' },
    ];
  
    const existingPermissions = await permissionRepository.find();
    const permissionsToCreate = permissionsData.filter(
      (pData) => !existingPermissions.some((ep) => ep.name === pData.name)
    );
  
    if (permissionsToCreate.length > 0) {
        const savedPermissions = await permissionRepository.save(
            permissionsToCreate.map((p) => permissionRepository.create(p))
          );
          logger.log(`Seeded ${savedPermissions.length} new permissions.`);
    } else {
        logger.log('No new permissions to seed.');
    }
    
  
    const allPermissions = await permissionRepository.find(); // Get all permissions, including previously existing ones
  
    // Define Roles and assign Permissions
    const rolesData = [
      {
        name: "SuperAdmin", // Explicit string literal workaround
        description: 'Global administrator with full platform access',
        permissions: allPermissions, // SuperAdmin gets all permissions
      },
      {
        name: 'Admin', // Legacy - retained in seeder for backward compatibility with migration
        description: 'Legacy tenant admin role (migrated to Admin Director)',
        permissions: allPermissions.filter(p =>
          !p.name.startsWith('superadmin:') && !p.name.startsWith('roles:')
        ),
      },
      {
          name: 'Finance', // Legacy - retained in seeder for backward compatibility with migration
          description: 'Legacy finance oversight role (migrated to Finance Manager)',
          permissions: allPermissions.filter(p =>
              p.name === 'expenses:read' ||
              p.name === 'expenses:approve' ||
              p.name === 'operational_budgets:read' ||
              p.name === 'reports:read' ||
              p.name === 'reports:export' ||
              p.name === 'wbs:read' ||
              p.name === 'projects:read'
          ),
      },
      {
        name: Role.CFO,
        description: 'Chief Financial Officer - Ultimate financial authority (Tenant Tier)',
        permissions: allPermissions.filter(p => !p.name.startsWith('superadmin:') && !p.name.startsWith('users:delete')),
      },
      {
        name: Role.AdminDirector,
        description: 'Director of Administration - Strategic resource management (Tenant Tier)',
        permissions: allPermissions.filter(p => !p.name.startsWith('superadmin:') && !p.name.startsWith('expenses:approve')),
      },
      {
        name: Role.OperationalDirector,
        description: 'Director of Operations - Operational strategy and budget oversight (Tenant Tier)',
        permissions: allPermissions.filter(p => !p.name.startsWith('superadmin:') && !p.name.startsWith('users:')),
      },
      {
        name: Role.TechnicalDirector,
        description: 'Director of Technology - Formerly IT Head, technical governance (Tenant Tier)',
        permissions: allPermissions.filter(p => !p.name.startsWith('superadmin:') && (p.name.startsWith('users:') || p.name === 'reports:read')),
      },
      {
          name: Role.CEO, // From shared enum
          description: 'Tenant user with high-level overview and reporting access',
          permissions: allPermissions.filter(p =>
              p.name === 'reports:read' ||
              p.name === 'reports:export' ||
              p.name === 'projects:read' ||
              p.name === 'wbs:read' ||
              p.name === 'expenses:read' ||
              p.name === 'operational_budgets:read'
          ),
      },
      {
          name: 'IT Head', // Legacy - retained in seeder for backward compatibility with migration
          description: 'Legacy IT management role (migrated to Technical Director)',
          permissions: allPermissions.filter(p =>
              p.name.startsWith('users:') ||
              p.name === 'tenant_settings:read' ||
              p.name === 'reports:read'
          ),
      },
      {
          name: Role.FinanceManager,
          description: 'Finance Manager - Operational financial control and primary approvals (Tenant Tier)',
          permissions: allPermissions.filter(p => 
            p.name.startsWith('expenses:') || 
            p.name.startsWith('operational_budgets:') || 
            p.name.startsWith('reports:') ||
            p.name.startsWith('wbs:')
          ),
      },
      {
          name: Role.AdminManager,
          description: 'Admin Manager - Human resources and administrative operations (Tenant Tier)',
          permissions: allPermissions.filter(p => p.name.startsWith('users:') || p.name === 'reports:read'),
      },
      {
          name: Role.ProjectManager,
          description: 'Project Manager - Project-level WBS and budget management (Tenant Tier)',
          permissions: allPermissions.filter(p => 
            p.name.startsWith('projects:') || 
            p.name.startsWith('wbs:') || 
            p.name === 'expenses:read' || 
            p.name === 'reports:read'
          ),
      },
      {
          name: Role.FinanceOfficer,
          description: 'Finance Officer - Data entry and initial verification (Tenant Tier)',
          permissions: allPermissions.filter(p => 
            p.name === 'expenses:create' || 
            p.name === 'expenses:read' || 
            p.name === 'wbs:read'
          ),
      },
      {
          name: Role.AdminOfficer,
          description: 'Admin Officer - Basic user support and administrative tasks (Tenant Tier)',
          permissions: allPermissions.filter(p => p.name === 'users:read'),
      },
      {
          name: Role.AssignedProjectUser, // From shared enum
          description: 'Standard user assigned to specific projects, primarily for data entry',
          permissions: allPermissions.filter(p =>
              p.name === 'projects:read' ||
              p.name === 'wbs:read' ||
              p.name === 'expenses:create' ||
              p.name === 'expenses:read' ||
              p.name === 'expenses:update' // Can update their own expenses
          ),
      },
    ];

    for (const roleData of rolesData) {
      let role = await roleRepository.findOne({ where: { name: roleData.name } });
  
      if (!role) {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Insert the role directly using SQL
            const [insertedRole] = await queryRunner.query(
                `INSERT INTO "public"."roles"("name", "description") VALUES ($1, $2) RETURNING "id"`,
                [roleData.name, roleData.description]
            );
            const newRoleId = insertedRole.id;

            // Insert role_permissions directly using SQL
            if (roleData.permissions && roleData.permissions.length > 0) {
                const rolePermissionValues = roleData.permissions.map(p => `('${newRoleId}', '${p.id}')`).join(',');
                await queryRunner.query(
                    `INSERT INTO "public"."role_permissions"("role_id", "permission_id") VALUES ${rolePermissionValues}`
                );
            }
            await queryRunner.commitTransaction();
            logger.log(`Created role via SQL: ${roleData.name}`);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            logger.error(`Error creating role via SQL: ${roleData.name}`, error);
            throw error; // Re-throw to indicate seeding failure
        } finally {
            await queryRunner.release();
        }
      } else {
        // Update existing role's permissions using TypeORM
        role.description = roleData.description;
        role.permissions = roleData.permissions; // This will update join table
        await roleRepository.save(role);
        logger.log(`Updated role via TypeORM: ${role.name}`);
      }
    }

    logger.log('🎉 Roles and permissions seeding completed successfully.');
    // await app.close(); // Removed app.close
    // process.exit(0); // This is in the finally block below now
}

// Add a finally block to ensure dataSource is destroyed and process exits
bootstrap().catch(error => {
    const logger = new Logger('SeedRolesPermissions');
    logger.error('❌ Failed to seed roles and permissions', error);
    process.exit(1);
}).finally(async () => { // New finally block
    if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        new Logger('SeedRolesPermissions').log('AppDataSource destroyed.');
    }
    process.exit(0);
});