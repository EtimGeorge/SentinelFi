// backend/src/auth/dto/update-user.dto.ts
import { IsUUID, IsEmail, IsString, IsNotEmpty, IsIn, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { IUpdateUserPayload } from '@shared/types/user'; // Import the shared interface
import { Role } from '@shared/types/role.enum'; // Import Role directly from its enum file

export class UpdateUserDto implements IUpdateUserPayload {
  @IsOptional()
  @IsString()
  @IsIn(Object.values(Role)) // Use Role directly
  role?: Role;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsUUID()
  tenant_id?: string | null;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;
}
