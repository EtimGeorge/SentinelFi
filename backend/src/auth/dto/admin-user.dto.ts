import { IsUUID, IsEmail, IsString, IsBoolean, IsOptional } from "class-validator";
import { Role } from "shared/types/role.enum";
import { User } from "shared/types/user"; // Path to shared User interface

// DTO for getting user lists (to exclude hash)
export class UserResponseDto implements User {
  @IsUUID()
  id!: string;

  @IsEmail()
  email!: string;

  @IsString()
  role!: Role;

  @IsBoolean()
  is_active!: boolean;

  @IsOptional()
  @IsUUID()
  tenant_id?: string | null;

  @IsOptional()
  @IsString()
  tenant_name?: string | null;
  isSuperAdmin?: boolean; // NEW: Added for frontend checks
}