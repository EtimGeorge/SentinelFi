import {
  IsUUID,
  IsEmail,
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { User, SimpleRole } from "@shared/types/user";
import { Role } from "@shared/types/role.enum";

// Create a class for SimpleRole to be used with @Type decorator
export class SimpleRoleDto implements SimpleRole {
  @IsUUID()
  id!: string;

  @IsString()
  @IsIn(Object.values(Role))
  name!: Role;

  @IsOptional()
  @IsString()
  description?: string;
}

// DTO for responding with user data (excludes password hash, etc.)
export class UserResponseDto implements User {
  @IsUUID()
  id!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimpleRoleDto) // Use the new DTO class here
  roles!: SimpleRoleDto[];

  @IsBoolean()
  is_active!: boolean;

  @IsOptional()
  @IsUUID()
  tenant_id?: string | null;

  @IsOptional()
  @IsString()
  tenant_name?: string | null;

  @IsOptional()
  @IsString()
  display_currency_code?: string; // NEW
}
