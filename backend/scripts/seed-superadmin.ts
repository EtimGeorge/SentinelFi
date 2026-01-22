import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { UserEntity } from '../src/auth/user.entity';
import { RoleEntity } from '../src/auth/role.entity'; // Import RoleEntity
import * as bcrypt from 'bcryptjs';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('SeedSuperAdmin');
  try {
    logger.log('Initializing application context to load correct environment and DB config...');
    const app = await NestFactory.createApplicationContext(AppModule);
    
    const dataSource = app.get(DataSource);
    const userRepo = dataSource.getRepository(UserEntity);
    const roleRepo = dataSource.getRepository(RoleEntity); // Get RoleRepository

    const email = 'superadmin@sentinelfi.com';
    const defaultPassword = '##Ndiong1988##'; 
    const superAdminRoleName = "SuperAdmin";

    // Fetch the SuperAdmin role from the database
    const superAdminRole = await roleRepo.findOne({ where: { name: superAdminRoleName } });
    if (!superAdminRole) {
      logger.error(`FATAL: The SuperAdmin role ('${superAdminRoleName}') does not exist in the database. Please run the roles/permissions seeder first.`);
      await app.close();
      process.exit(1);
    }

    logger.log(`🔍 Checking for user: ${email} in the connected database...`);
    // Eager load roles to properly update the relationship
    let user = await userRepo.findOne({ where: { email }, relations: ['roles'] });

    if (!user) {
      logger.log('⚠️ User not found. Creating new SuperAdmin...');
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      user = userRepo.create({
        email,
        password_hash: hashedPassword,
        first_name: 'Super',
        last_name: 'System Admin',
        roles: [superAdminRole], // Assign the RoleEntity
        is_active: true,
        tenant_id: null, 
      });
      logger.log(`✅ Created new SuperAdmin with password: ${defaultPassword}`);
    } else {
      logger.log(`ℹ️ User found (ID: ${user.id}). Updating roles and RESETTING password...`);
      user.roles = [superAdminRole]; // Overwrite existing roles with only SuperAdmin role
      user.is_active = true;
      user.tenant_id = null; // Ensure SuperAdmin has no tenant_id
      // Force reset the password to the default
      user.password_hash = await bcrypt.hash(defaultPassword, 10);
      
      logger.log(`✅ Password has been reset to: ${defaultPassword}`);
      logger.log(`✅ Targeted Roles: [${superAdminRoleName}], Tenant: NULL`);
    }

    const savedUser = await userRepo.save(user);
    logger.log(`✅ Final Database State - Roles: ${savedUser.roles.map(r => r.name)}, Tenant: ${savedUser.tenant_id}`);
    logger.log('🎉 SuperAdmin seeding completed successfully.');
    
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to seed SuperAdmin', error);
    process.exit(1);
  }
}

bootstrap();