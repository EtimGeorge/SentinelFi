import { IsString, IsEmail, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from '../entities/subscription.entity';

export class ProvisionOfflineTenantDto {
  @IsString()
  companyName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  plan!: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @Type(() => Number)
  @IsNumber()
  amountUsd!: number;

  @Type(() => Number)
  @IsNumber()
  months!: number;

  @IsOptional()
  @IsString()
  paymentProofText?: string;

  @IsOptional()
  @IsString()
  offlineBankReference?: string;
}
