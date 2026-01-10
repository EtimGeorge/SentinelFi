// backend/src/auth/dto/create-user.dto.ts
import {
  IsUUID,
  IsEmail,
  IsString,
  IsNotEmpty,
  IsIn,
  IsBoolean,
  IsOptional,
  MinLength,
} from "class-validator";
import { ICreateUserPayload } from "@shared/types/user"; // Import the shared interface
import { Role } from "@shared/types/role.enum"; // Import Role directly from its enum file

export class CreateUserDto implements ICreateUserPayload {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: "Password must be at least 8 characters long" }) // Enforce security standards
  password!: string; // Made explicitly non-optional for backend validation

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsString()
  @IsIn(Object.values(Role)) // Use Role directly
  role!: Role;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsUUID()
  tenant_id?: string | null;
}
