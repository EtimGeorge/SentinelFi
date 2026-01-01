import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "./user.entity";
import { Role } from "shared/types/role.enum";
import { AuthService } from "./auth.service";

@Injectable()
export class SeedTestUsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedTestUsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private authService: AuthService,
  ) {}

  // Automatically runs when the application successfully starts
  async onApplicationBootstrap() {
    await this.seedUsers();
  }

  async seedUsers() {
    this.logger.log("--- Phase 3: FINAL DESTRUCTIVE RE-SEED ---");

    // Define the users to create with the password 'P@ssw0rd'
    const usersToSeed = [
      { email: "admin@sentinelfi.com", role: Role.Admin, password: "P@ssw0rd" },
      {
        email: "finance@sentinelfi.com",
        role: Role.Finance,
        password: "P@ssw0rd",
      },
      {
        email: "projectuser@sentinelfi.com",
        role: Role.AssignedProjectUser,
        password: "P@ssw0rd",
      },
      { email: "ceo@sentinelfi.com", role: Role.CEO, password: "P@ssw0rd" },
      {
        email: "ophead@sentinelfi.com",
        role: Role.OperationalHead,
        password: "P@ssw0rd"
      },
    ];

    for (const user of usersToSeed) {
      const existing = await this.usersRepository.findOne({
        where: { email: user.email },
      });

      if (existing) {
        // DELETE existing user to force a fresh hash creation
        await this.usersRepository.delete(existing.id);
      }

      // The password is automatically hashed via the @BeforeInsert hook in UserEntity
      await this.authService.registerUser(
        user.email,
        user.password,
        user.role,
        undefined, // Pass undefined for tenantId as these are not tenant-specific users
      );
      this.logger.log(
        `- RE-SEEDED user: ${user.email} with Role: ${user.role} and PWD: P@ssw0rd`,
      );
    }
    this.logger.log("--- FINAL SEEDING COMPLETE ---");
  }
}
