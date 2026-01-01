import { IsUUID, IsEmail, IsString, IsNotEmpty, IsIn, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { Role } from './role.enum'; // Updated path

// Interface for a User - This will be the single source of truth for the User object shape
export interface User {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
  tenant_id?: string | null; // NEW: User's assigned tenant ID
  tenant_name?: string | null; // NEW: User's assigned tenant name (for display)
}

export interface JwtPayload extends User {
  iat: number; // Issued at (timestamp)
  exp: number; // Expiration time (timestamp)
  // clientSchema?: string; // Removed, standardized to tenant_id
}

// List of all valid roles for validation - copied from backend DTO for convenience here
const validRoles = Object.values(Role);

// DTO for creating a new user (initial registration) - Used by backend, can be referenced by frontend forms
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' }) // Enforce security standards
  password!: string;

  @IsString()
  @IsIn(validRoles)
  role!: Role;

  @IsOptional()
  @IsUUID()
  tenant_id?: string | null; // NEW: Optional tenant ID for creation
}

// DTO for updating an existing user (role change, status change) - Used by backend
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsIn(validRoles)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsUUID()
  tenant_id?: string | null; // NEW: Optional tenant ID for update
}
