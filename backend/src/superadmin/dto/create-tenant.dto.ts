import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  schema_name!: string; // Database schema name for the tenant

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  // The email of the first admin user for this tenant
  admin_email!: string; 

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @IsOptional()
  @IsUUID()
  id?: string; // For patching a specific tenant by ID
}

export class GetTenantsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  schema_name?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
