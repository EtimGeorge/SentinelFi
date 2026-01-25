import { Injectable, OnApplicationBootstrap, Logger, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "./user.entity";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import * as bcrypt from 'bcryptjs';
import { RoleEntity } from "./role.entity";
import { RetryableQuery } from "../common/config/database.config";

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
    // Strategic delay: Wait for 5 seconds before starting the seeder
    // This allows migrations and initial database warming to complete
    this.logger.log('Waiting 5s for database stability before seeding...');
    await new Promise(resolve => setTimeout(resolve, 5000));
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
        superAdminEmail = superAdminEmail || "superadmin@sentinelfi.com";
        superAdminPassword = superAdminPassword || "password";
        this.logger.warn(`Using development default SuperAdmin credentials: ${superAdminEmail}`);
      }
    }

    const superAdminRoleName = "SuperAdmin";

    try {
        // Use RetryableQuery with generous retries and delay during startup
        const superAdminRole = await RetryableQuery.execute(
            () => this.roleRepository.findOne({ where: { name: superAdminRoleName } }),
            5, // 5 retries
            1000 // 1s base delay
        );

        if (!superAdminRole) {
            if (isProduction) {
                this.logger.error(`FATAL: The '${superAdminRoleName}' role does not exist.`);
                throw new InternalServerErrorException(`SuperAdmin role '${superAdminRoleName}' not found.`);
            } else {
                this.logger.warn(`The '${superAdminRoleName}' role does not exist yet. Skipping SuperAdmin user creation for now. It will be created by seeding scripts.`);
                return; // Exit gracefully in development if role not found yet
            }
        }

        // --- Find or Create SuperAdmin User ---
        let user = await RetryableQuery.execute(
            () => this.usersRepository.createQueryBuilder("user")
                .addSelect("user.password_hash")
                .leftJoinAndSelect("user.roles", "role")
                .where("user.email = :email", { email: superAdminEmail })
                .getOne(),
            5,
            1000
        );

        let passwordChanged = false;

        if (!user) {
            this.logger.log(`User '${superAdminEmail}' not found. Creating new SuperAdmin...`);
            user = this.usersRepository.create({
                email: superAdminEmail,
                first_name: 'Super',
                last_name: 'Admin',
                is_active: true,
                tenant_id: null,
            });
            user.password_hash = await bcrypt.hash(superAdminPassword, 10);
            user.roles = [superAdminRole];
            
            await RetryableQuery.execute(() => this.usersRepository.save(user!), 3, 1000);
            this.logger.log(`Created new SuperAdmin user: ${superAdminEmail}`);
            passwordChanged = true;
        } else {
            this.logger.log(`SuperAdmin user '${superAdminEmail}' found. Ensuring correct configuration...`);
            let needsUpdate = false;

            // 1. Ensure only SuperAdmin role is assigned
            const currentRoleNames = user.roles.map(r => r.name);
            if (currentRoleNames.length !== 1 || currentRoleNames[0] !== superAdminRoleName) {
                user.roles = [superAdminRole];
                needsUpdate = true;
            }

            // 2. Ensure tenant_id is null
            if (user.tenant_id !== null) {
                user.tenant_id = null;
                needsUpdate = true;
            }

            // 3. Update password if provided
            if (superAdminPassword && user.password_hash && !(await bcrypt.compare(superAdminPassword, user.password_hash))) {
                user.password_hash = await bcrypt.hash(superAdminPassword, 10);
                needsUpdate = true;
                passwordChanged = true;
            } else if (nodeEnv === "development" && !superAdminPassword) {
                if (user.password_hash && !(await bcrypt.compare("password", user.password_hash))) {
                    user.password_hash = await bcrypt.hash("password", 10);
                    needsUpdate = true;
                    passwordChanged = true;
                }
            }

            if (needsUpdate) {
                await RetryableQuery.execute(() => this.usersRepository.save(user!), 3, 1000);
                this.logger.log(`Updated SuperAdmin user '${superAdminEmail}'.`);
            }
        }
        
        if (passwordChanged) {
            this.logger.warn(`!!! IMPORTANT !!! SuperAdmin password updated successfully.`);
        }

    } catch (error: unknown) {
      this.logger.error(`Failed to seed SuperAdmin: ${superAdminEmail}`, error instanceof Error ? error.stack : error);
      if (isProduction) {
        throw new InternalServerErrorException(`SuperAdmin seeding failed.`);
      }
    }

    this.logger.log("--- SuperAdmin Seeding Complete ---");
  }
}