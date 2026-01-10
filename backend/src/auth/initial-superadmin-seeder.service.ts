import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "./user.entity";
import { Role } from "shared/types/role.enum";
import { AuthService } from "./auth.service";
import { ConfigService } from "@nestjs/config"; // NEW
import { randomBytes } from "crypto"; // NEW

@Injectable()
export class InitialSuperAdminSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InitialSuperAdminSeederService.name);

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private authService: AuthService,
    private configService: ConfigService, // NEW
  ) {}

  // Automatically runs when the application successfully starts
  async onApplicationBootstrap() {
    await this.seedUsers();
  }

  async seedUsers() {
    // Only seed in development environment and if explicitly enabled
    const nodeEnv = this.configService.get<string>("NODE_ENV");
    const seedSuperAdmin = this.configService.get<string>("SEED_SUPERADMIN");

    if (nodeEnv !== "development" || seedSuperAdmin !== "true") {
      this.logger.log("SuperAdmin seeding is skipped (not in development or SEED_SUPERADMIN not 'true').");
      return;
    }

    this.logger.log("--- Starting Initial SuperAdmin Seeding (Development Only) ---");

    const superAdminEmail = "superadmin@sentinelfi.com";
    const superAdminRole = Role.SuperAdmin;
    
    // Generate a random, secure password for the SuperAdmin
    const generatedPassword = randomBytes(16).toString('hex'); // 32 characters long
    const passwordToUse = this.configService.get<string>("SUPERADMIN_PASSWORD") || generatedPassword;


    const existingSuperAdmin = await this.usersRepository.findOne({
      where: { email: superAdminEmail },
    });

    if (existingSuperAdmin) {
      this.logger.log(`- SuperAdmin user already exists: ${superAdminEmail}. Skipping re-creation.`);
      return;
    }

    try {
      await this.authService.registerUser(
        superAdminEmail,
        passwordToUse,
        superAdminRole,
        null, // SuperAdmin does not belong to a specific tenant
      );
      this.logger.log(`- Created new SuperAdmin user: ${superAdminEmail}`);
      this.logger.warn(`- !!! IMPORTANT !!! SuperAdmin password for development: ${passwordToUse}`);
      this.logger.warn(`- Please change this password immediately in a production-like environment.`);
    } catch (error) {
      this.logger.error(`- Failed to create SuperAdmin user: ${superAdminEmail}`, error instanceof Error ? error.stack : error);
    }

    this.logger.log("--- Initial SuperAdmin Seeding Complete ---");
  }
}
