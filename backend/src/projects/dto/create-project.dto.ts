import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  IsNumber,
  IsUUID,
} from "class-validator";
import { ProjectStatus } from "../enums/project.enum";

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  project_name!: string;

  @IsOptional()
  @IsString()
  rfq_number?: string;

  @IsOptional()
  @IsString()
  sow_details?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsNumber()
  contract_value?: number;

  @IsOptional()
  @IsNumber()
  contingency_percent?: number;

  @IsOptional()
  @IsNumber()
  vat_rate?: number;

  @IsOptional()
  @IsNumber()
  wht_rate?: number;

  @IsOptional()
  @IsUUID()
  client_id?: string;
}
