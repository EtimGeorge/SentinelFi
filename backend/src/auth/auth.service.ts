import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';
import { Role } from './enums/role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  /**
   * User Login Logic (Final Production Version)
   */
  async login(loginDto: LoginUserDto): Promise<{ access_token: string, user_role: Role }> {
    
    // 1. Find User by Email
    const user = await this.usersRepository.findOne({ 
      where: { email: loginDto.email },
      select: ['id', 'email', 'password_hash', 'role', 'is_active'], 
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials or user is inactive.');
    }
    
    console.log('DEBUG 1: User found. Validating password.');

    // 2. CRITICAL SECURITY: Use direct bcrypt comparison against the loaded hash
    const passwordValid = await bcrypt.compare(loginDto.password, user.password_hash);
    
    if (!passwordValid) {
      console.log('DEBUG 2: Password validation failed');
      throw new UnauthorizedException('Invalid credentials.');
    }
    
    console.log('DEBUG 2: Password validation passed.');

    // 3. Generate JWT Payload
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role, 
    };
    
    // 4. Generate and Return Token
    console.log('DEBUG 3: Generating JWT token.');
    return { 
      access_token: this.jwtService.sign(payload),
      user_role: user.role
    };
  }

  /**
   * FIXED: User registration utility (hashes manually before save).
   * @param plainPassword The plain text password to hash.
   */
  async registerTestUser(email: string, plainPassword: string, role: Role): Promise<UserEntity> {
    // CRITICAL FIX: Manually hash the password here, preventing double-hashing.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    
    const newUser = this.usersRepository.create({ 
      email, 
      password_hash: hashedPassword, // The hashed value is explicitly assigned to the 'password_hash' field
      role 
    });
    
    return this.usersRepository.save(newUser);
  }
}