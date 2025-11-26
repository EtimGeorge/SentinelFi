import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto'; // DTO to be created next
import { Role } from './enums/role.enum'; // For use in token payload

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  /**
   * Phase 3 Deliverable: User Login Logic
   * Finds user, validates password, and generates a signed JWT token.
   */
  async login(loginDto: LoginUserDto): Promise<{ access_token: string, user_role: Role }> {
    
    // 1. Find User by Email
    // Note: Must explicitly select the password_hash column for validation
    const user = await this.usersRepository.findOne({ 
      where: { email: loginDto.email },
      select: ['id', 'email', 'password_hash', 'role', 'is_active'], 
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials or user is inactive.');
    }

    // 2. Secure Password Validation (using bcrypt)
    const passwordValid = await user.validatePassword(loginDto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // 3. Generate JWT Payload
    const payload = { 
      email: user.email, 
      sub: user.id, // 'sub' is the standard subject/user ID claim
      role: user.role, // CRITICAL: Embed the RBAC role for policy enforcement
    };
    
    // 4. Generate and Return Token
    return { 
      access_token: this.jwtService.sign(payload),
      user_role: user.role
    };
  }

  // Utility method: Creates a user for initial setup/testing (will be removed in final cleanup)
  async registerTestUser(email: string, password_hash: string, role: Role): Promise<UserEntity> {
    const newUser = this.usersRepository.create({ email, password_hash, role });
    await newUser.hashPassword(); // Runs the @BeforeInsert hook if not already hashed
    return this.usersRepository.save(newUser);
  }
}