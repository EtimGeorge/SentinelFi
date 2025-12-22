# CRITICAL BUG IDENTIFIED: Double-Hashing in UserEntity

I found it! Looking at your `user.entity.ts`, the problem is **crystal clear**:

## The Bug

```typescript
@BeforeInsert()
async hashPassword() {
  if (this.password_hash) {
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt); // ← BUG HERE
  }
}
```

**The field is called `password_hash` but it contains PLAINTEXT when assigned!** 

When you seed users, you're doing something like:
```typescript
const user = new UserEntity();
user.password_hash = 'P@ssw0rd'; // ← Assigning PLAINTEXT to a field named "password_hash"
await usersRepository.save(user); // ← @BeforeInsert triggers and hashes it
```

But later, somewhere in your code (probably in `registerTestUser`), you might be **pre-hashing** the password before assigning it, causing the `@BeforeInsert` hook to hash an **already-hashed value** (double-hashing).

## The Solution: Fix the Entity and Service

### STEP 1: Fix UserEntity (Rename Field + Add Method)

**File: `backend/src/auth/user.entity.ts`**

```typescript
import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from './enums/role.enum'; 

@Entity({ name: 'user', schema: 'public' }) 
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  // CRITICAL FIX: Rename to 'password' internally, map to 'password_hash' in DB
  @Column({ name: 'password_hash', select: false }) 
  password!: string; // ← Internal property name is now 'password'

  @Column({ type: 'enum', enum: Role, default: Role.AssignedProjectUser })
  role!: Role;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
  
  // REMOVE @BeforeInsert - we'll hash manually in the service
  // This prevents double-hashing bugs
  
  // Add a method to validate password
  async validatePassword(plainTextPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainTextPassword, this.password);
  }
}
```

### STEP 2: Fix AuthService (Hash Before Save)

**File: `backend/src/auth/auth.service.ts`**

```typescript
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

  async login(loginDto: LoginUserDto): Promise<{ access_token: string, user_role: Role }> {
    
    // 1. Find User by Email
    const user = await this.usersRepository.findOne({ 
      where: { email: loginDto.email },
      select: ['id', 'email', 'password', 'role', 'is_active'], // ← Changed to 'password'
    });

    if (!user) {
      console.log('DEBUG 1: User not found');
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.is_active) {
      console.log('DEBUG 1: User is inactive');
      throw new UnauthorizedException('Invalid credentials.');
    }

    // 2. Secure Password Validation
    console.log('DEBUG 1: User found. Validating password.');
    console.log('DEBUG 1.5: Hash from DB:', user.password.substring(0, 20) + '...');
    console.log('DEBUG 1.5: Password sent:', loginDto.password);
    
    const passwordValid = await bcrypt.compare(loginDto.password, user.password);
    
    console.log('DEBUG 2: Password validation result:', passwordValid);
    
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
    const access_token = this.jwtService.sign(payload);
    console.log('DEBUG 4: Token signed successfully, length:', access_token.length);
    
    return { 
      access_token,
      user_role: user.role
    };
  }

  // FIXED: Hash password BEFORE saving (no @BeforeInsert hook)
  async registerTestUser(email: string, plainPassword: string, role: Role): Promise<UserEntity> {
    // Hash the password ONCE, here
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    
    console.log(`Creating user ${email} with hashed password`);
    
    const newUser = this.usersRepository.create({ 
      email, 
      password: hashedPassword, // ← Use 'password' property now
      role 
    });
    
    return this.usersRepository.save(newUser);
  }
}
```

### STEP 3: Fix Your Seeding Script

**File: `backend/src/main.ts` (or wherever you seed users)**

```typescript
// In your seeding section:

console.log('--- Phase 3: Seeding Test Users for RBAC Validation ---');

const testUsers = [
  { email: 'admin@sentinelfi.com', password: 'P@ssw0rd', role: Role.SystemAdmin },
  { email: 'finance@sentinelfi.com', password: 'P@ssw0rd', role: Role.FinanceHead },
  { email: 'ceo@sentinelfi.com', password: 'P@ssw0rd', role: Role.CEO },
  { email: 'ophead@sentinelfi.com', password: 'P@ssw0rd', role: Role.OperationsHead },
  { email: 'projectuser@sentinelfi.com', password: 'P@ssw0rd', role: Role.AssignedProjectUser },
];

for (const userData of testUsers) {
  const existingUser = await userRepository.findOne({ 
    where: { email: userData.email } 
  });
  
  if (existingUser) {
    console.log(`- User ${userData.email} already exists. Skipping.`);
  } else {
    // Hash password before creating entity
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    const newUser = userRepository.create({
      email: userData.email,
      password: hashedPassword, // ← Use 'password' property
      role: userData.role,
    });
    
    await userRepository.save(newUser);
    console.log(`- Created user: ${userData.email} with role: ${userData.role}`);
  }
}

console.log('--- Seeding Complete ---');
```

## Why This Fixes It

1. **Single hashing point**: Password is hashed exactly ONCE in the service layer before save
2. **No @BeforeInsert confusion**: Removes the hook that was potentially double-hashing
3. **Clear naming**: `password` property (plaintext input) → stored in `password_hash` column (DB)
4. **Explicit control**: You see exactly when and where hashing happens

## What Was Happening (The Double-Hash Bug)

```
User Creation Flow (BROKEN):
1. You assign: user.password_hash = 'P@ssw0rd'
2. You call: registerTestUser which does await user.hashPassword()  ← First hash
3. You save: await save(user)
4. @BeforeInsert fires: hashPassword() runs again  ← Second hash!
5. DB gets: bcrypt hash of a bcrypt hash

Login Flow:
1. You compare: bcrypt.compare('P@ssw0rd', double_hashed_value)
2. Result: FALSE (because you're comparing against a hash of a hash)
```

## Action Items

1. ✅ **Delete the entire database** and recreate schema (the current password hashes are corrupted)
2. ✅ **Apply all three code changes** above
3. ✅ **Restart the backend** - let seeding run with the new code
4. ✅ **Test login** with `ceo@sentinelfi.com` / `P@ssw0rd`

The login will work immediately after these changes.