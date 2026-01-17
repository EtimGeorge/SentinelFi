import { Injectable, OnApplicationBootstrap, Logger, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "./user.entity";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import * as bcrypt from 'bcryptjs';
import { RoleEntity } from "./role.entity";

@Injectable()
export class InitialSuperAdminSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InitialSuperAdminSeederService.name);

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private roleRepository: Repository<RoleEntity>,
    private configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.seedSuperAdmin();
  }

  async seedSuperAdmin() {
    const nodeEnv = this.configService.get<string>("NODE_ENV", "development"); // Default to development
    this.logger.log(`--- Starting SuperAdmin Seeding (NODE_ENV: ${nodeEnv}) ---`);

    let superAdminEmail = this.configService.get<string>("SUPERADMIN_EMAIL");
    let superAdminPassword = this.configService.get<string>("SUPERADMIN_PASSWORD");

    const isProduction = nodeEnv === "production";

    // --- Determine SuperAdmin Credentials ---
    if (!superAdminEmail || !superAdminPassword) {
      if (isProduction) {
        this.logger.error("FATAL: SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in production environment variables.");
        throw new InternalServerErrorException("SuperAdmin credentials not configured for production.");
      } else {
        // Development fallback
        superAdminEmail = superAdminEmail || "superadmin@sentinelfi.com";
        superAdminPassword = superAdminPassword || "password"; // Simple default for dev
        this.logger.warn(`Using development default SuperAdmin credentials: ${superAdminEmail} / ${superAdminPassword}`);
      }
    } else {
      this.logger.log(`Using SuperAdmin credentials from environment variables: ${superAdminEmail}`);
    }

    const superAdminRoleName = "SuperAdmin"; // Use string literal to avoid enum resolution issues

    try {
        const superAdminRole = await this.roleRepository.findOne({ where: { name: superAdminRoleName } });
        if (!superAdminRole) {
            this.logger.error(`FATAL: The '${superAdminRoleName}' role does not exist in the database. Please run the roles/permissions seeder first.`);
            throw new InternalServerErrorException(`SuperAdmin role '${superAdminRoleName}' not found.`);
        }

        // --- Find or Create SuperAdmin User ---
        let user = await this.usersRepository.findOne({
            where: { email: superAdminEmail },
            relations: ["roles"], // Eager load roles to manage relationship
        });

        let passwordChanged = false;

        if (!user) {
            this.logger.log(`User '${superAdminEmail}' not found. Creating new SuperAdmin...`);
            user = this.usersRepository.create({
                email: superAdminEmail,
                first_name: 'Super',
                last_name: 'Admin',
                is_active: true,
                tenant_id: null, // SuperAdmin must not have a tenant_id
            });
            user.password_hash = await bcrypt.hash(superAdminPassword, 10);
            user.roles = [superAdminRole]; // Assign only the SuperAdmin role
            await this.usersRepository.save(user); // CRITICAL: Save the newly created user
            this.logger.log(`Created new SuperAdmin user: ${superAdminEmail}`);
            passwordChanged = true;
        } else {
            this.logger.log(`SuperAdmin user '${superAdminEmail}' found. Ensuring correct configuration...`);
            
            // --- Update Existing User Configuration ---
            let needsUpdate = false;

            // 1. Ensure only SuperAdmin role is assigned
            const currentRoleNames = user.roles.map(r => r.name);
            if (currentRoleNames.length !== 1 || currentRoleNames[0] !== superAdminRoleName) {
                user.roles = [superAdminRole];
                needsUpdate = true;
                this.logger.log(`Updated roles for '${superAdminEmail}' to only SuperAdmin.`);
            }

            // 2. Ensure tenant_id is null
            if (user.tenant_id !== null) {
                user.tenant_id = null;
                needsUpdate = true;
                this.logger.log(`Cleared tenant_id for SuperAdmin '${superAdminEmail}'.`);
            }

            // 3. Update password if SUPERADMIN_PASSWORD env var is explicitly provided and different
            if (superAdminPassword && !(await bcrypt.compare(superAdminPassword, user.password_hash))) {
                user.password_hash = await bcrypt.hash(superAdminPassword, 10);
                needsUpdate = true;
                passwordChanged = true;
                this.logger.log(`Updated password for SuperAdmin '${superAdminEmail}' from environment variable.`);
            } else if (nodeEnv === "development" && !superAdminPassword) {
                // In dev, if no env var password, always reset to default 'password' if it's not already
                if (!(await bcrypt.compare("password", user.password_hash))) {
                    user.password_hash = await bcrypt.hash("password", 10);
                    needsUpdate = true;
                    passwordChanged = true;
                    this.logger.log(`Reset SuperAdmin password to development default 'password'.`);
                }
            }


            if (needsUpdate) {
                await this.usersRepository.save(user);
                this.logger.log(`Updated SuperAdmin user '${superAdminEmail}'.`);
            } else {
                this.logger.log(`SuperAdmin user '${superAdminEmail}' is already configured correctly. Skipping update.`);
            }
        }
        
        if (passwordChanged) {
            this.logger.warn(`!!! IMPORTANT !!! SuperAdmin password: ${superAdminPassword}`);
        } else {
            this.logger.log(`SuperAdmin password was not changed.`);
        }

    } catch (error: unknown) { // Explicitly type error as unknown
      let errorMessage = "An unknown error occurred during SuperAdmin seeding.";
      if (error instanceof Error) { // Narrow the type
          errorMessage = error.message;
      }
      this.logger.error(`Failed to seed SuperAdmin: ${superAdminEmail}`, error instanceof Error ? error.stack : error);
      // In production, we should consider throwing to halt startup if seeding fails critically
      if (isProduction) {
        throw new InternalServerErrorException(`SuperAdmin seeding failed: ${errorMessage}`);
      }
    }

    this.logger.log("--- SuperAdmin Seeding Complete ---");
  }
}