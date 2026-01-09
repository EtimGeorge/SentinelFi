import { PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from 'shared/types/user';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { Role } from 'shared/types/role.enum'; // Ensure Role is imported

export class CreateTenantAdminUserDto extends PickType(CreateUserDto, [
  'email',
  'first_name',
  'last_name',
  'role',
  'is_active',
  'tenant_id',
]) {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsUUID()
  tenant_id?: string | null;

  // The role is explicitly set for tenant admins, so it should be mandatory
  // but if we extend from CreateUserDto, it will already be marked as mandatory
  // For clarity, we can optionally override it here if needed.
  // @IsIn(Object.values(Role)) // This should already be handled by CreateUserDto
  // role!: Role;
}
