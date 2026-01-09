import { PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from '@shared/types/user';
import { IsOptional, IsString, IsUUID, IsEmail, IsNotEmpty, IsBoolean, IsIn } from 'class-validator';
import { Role } from '@shared/types/role.enum'; // Ensure Role is imported

export class CreateTenantAdminUserDto extends PickType(CreateUserDto, [
  'email',
  'first_name',
  'last_name',
  'role',
  'is_active',
  'tenant_id',
]) {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsIn(Object.values(Role))
  role!: Role;

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