import { PickType } from "@nestjs/mapped-types";
import { CreateUserDto } from "../../auth/dto/create-user.dto"; // Import backend-specific CreateUserDto class
import {
  IsOptional,
  IsString,
  IsUUID,
  IsEmail,
  IsNotEmpty,
  IsBoolean,
  IsIn,
} from "class-validator";
import { Role } from "@shared/types/role.enum"; // Ensure Role is imported from shared types

export class CreateTenantAdminUserDto extends PickType(CreateUserDto, [
  "email",
  "first_name",
  "last_name",
  "role",
  "is_active",
  "tenant_id",
]) {}
