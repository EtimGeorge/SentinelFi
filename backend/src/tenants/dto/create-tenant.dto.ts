import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string; // Unique identifier for the tenant/client

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  projectName!: string; // Human-readable project name

  // initialBudgetFile (File) will be handled separately by the controller's file interceptor
}