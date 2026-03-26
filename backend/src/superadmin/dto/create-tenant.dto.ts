import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
} from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  schema_name?: string;

  @IsNotEmpty()
  @IsString()
  admin_email!: string;

  @IsOptional()
  @IsString()
  admin_first_name?: string;

  @IsOptional()
  @IsString()
  admin_last_name?: string;

  @IsOptional()
  @IsString()
  default_currency_code?: string;
}

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @IsOptional()
  @IsUUID()
  id?: string; // For patching a specific tenant by ID
}

export class UpdateTenantBrandingDto {
  @IsOptional()
  @IsString()
  brandLogoBase64?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  brandPrimaryColorHex?: string;

  @IsOptional()
  @IsString()
  companyAddress?: string;
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
