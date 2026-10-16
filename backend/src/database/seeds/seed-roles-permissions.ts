// backend/src/database/seeds/seed-roles-permissions.ts
// Instruction: Refactor the script to initialize TypeORM DataSource directly instead of creating a full NestJS app context.
// Remove NestFactory and AppModule imports.
// Update the bootstrap function to directly initialize and use the TypeORM DataSource.
// Ensure correct `AppDataSource` import.

import { DataSource } from "typeorm"; // Import DataSource directly
import { RoleEntity } from "../../auth/role.entity";
import { PermissionEntity } from "../../auth/permission.entity";
import { Logger } from "@nestjs/common"; // Keep Logger, it's a simple class, though a plain console.log might be faster
// Removed: import { NestFactory } from '@nestjs/core';
// Removed: import { AppModule } from '../../app.module';

import AppDataSource from "../../../ormconfig"; // Import the default public AppDataSource from monorepo root config
import { PERMISSIONS, ROLES } from "./rbac.seed-data";

async function bootstrap() {
  const logger = new Logger("SeedRolesPermissions");
  logger.log(
    "Initializing TypeORM DataSource directly for seeding roles and permissions...",
  );

  // Initialize DataSource directly
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const dataSource = AppDataSource; // Use the initialized DataSource

  const roleRepository = dataSource.getRepository(RoleEntity);
  const permissionRepository = dataSource.getRepository(PermissionEntity);

  // Permission catalog is defined once in ./rbac.seed-data.ts and shared with
  // the SeedRbacRolesAndPermissions migration so the two cannot drift apart.
  const permissionsData = PERMISSIONS;

  const existingPermissions = await permissionRepository.find();
  const permissionsToCreate = permissionsData.filter(
    (pData) => !existingPermissions.some((ep) => ep.name === pData.name),
  );

  if (permissionsToCreate.length > 0) {
    const savedPermissions = await permissionRepository.save(
      permissionsToCreate.map((p) => permissionRepository.create(p)),
    );
    logger.log(`Seeded ${savedPermissions.length} new permissions.`);
  } else {
    logger.log("No new permissions to seed.");
  }

  const allPermissions = await permissionRepository.find(); // Get all permissions, including previously existing ones

  // Role definitions (name/description + the permission-grant rule) also live
  // in ./rbac.seed-data.ts. `grant` is applied to the persisted entities so the
  // join table receives rows with real permission ids.
  const rolesData = ROLES.map((role) => ({
    name: role.name,
    description: role.description,
    permissions: role.grant(allPermissions),
  }));

  for (const roleData of rolesData) {
    const role = await roleRepository.findOne({
      where: { name: roleData.name },
    });

    if (!role) {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        // Insert the role directly using SQL
        const [insertedRole] = await queryRunner.query(
          `INSERT INTO "public"."roles"("name", "description") VALUES ($1, $2) RETURNING "id"`,
          [roleData.name, roleData.description],
        );
        const newRoleId = insertedRole.id;

        // Insert role_permissions directly using SQL
        if (roleData.permissions && roleData.permissions.length > 0) {
          const rolePermissionValues = roleData.permissions
            .map((p) => `('${newRoleId}', '${p.id}')`)
            .join(",");
          await queryRunner.query(
            `INSERT INTO "public"."role_permissions"("role_id", "permission_id") VALUES ${rolePermissionValues}`,
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

  logger.log("🎉 Roles and permissions seeding completed successfully.");
  // await app.close(); // Removed app.close
  // process.exit(0); // This is in the finally block below now
}

// Add a finally block to ensure dataSource is destroyed and process exits
bootstrap()
  .catch((error) => {
    const logger = new Logger("SeedRolesPermissions");
    logger.error("❌ Failed to seed roles and permissions", error);
    process.exit(1);
  })
  .finally(async () => {
    // New finally block
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      new Logger("SeedRolesPermissions").log("AppDataSource destroyed.");
    }
    process.exit(0);
  });
