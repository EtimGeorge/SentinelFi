import {
  IsString,
  IsNumber,
  IsBoolean,
  IsDate,
  IsOptional,
  IsUUID,
  IsPositive,
} from "class-validator";
import { Type } from "class-transformer";

export interface TenantPlan {
  // Changed from class to interface
  plan_id: string;
  plan_name: string;
  max_users: number;
  max_storage_gb: number;
  expires_at: Date;
  is_active: boolean;
  price: number;
}

export class UpdateTenantPlanDto {
  @IsOptional()
  @IsString()
  plan_name?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  max_users?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  max_storage_gb?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expires_at?: Date;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;
}
