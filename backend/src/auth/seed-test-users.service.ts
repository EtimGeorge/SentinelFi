import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { Role } from './enums/role.enum';
import { AuthService } from './auth.service';

@Injectable()
export class SeedTestUsersService implements OnApplicationBootstrap {
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
    console.log('--- Phase 3: Seeding Test Users for RBAC Validation ---');

    // Define the users to create (with a simple default password 'password')
    const usersToSeed = [
      { email: 'admin@sentinelfi.com', role: Role.Admin, password: 'password' },
      { email: 'finance@sentinelfi.com', role: Role.Finance, password: 'password' },
      { email: 'projectuser@sentinelfi.com', role: Role.AssignedProjectUser, password: 'password' },
      { email: 'ceo@sentinelfi.com', role: Role.CEO, password: 'password' },
      { email: 'ophead@sentinelfi.com', role: Role.OperationalHead, password: 'password' },
    ];

    for (const user of usersToSeed) {
      const existing = await this.usersRepository.findOne({ where: { email: user.email } });
      
      if (!existing) {
        // The password is automatically hashed via the @BeforeInsert hook in UserEntity
        await this.authService.registerTestUser(user.email, user.password, user.role);
        console.log(`- Seeded user: ${user.email} with Role: ${user.role}`);
      } else {
        console.log(`- User ${user.email} already exists. Skipping.`);
      }
    }
    console.log('--- Seeding Complete ---');
  }
}