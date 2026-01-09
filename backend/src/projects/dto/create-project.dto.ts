import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ProjectStatus } from '../enums/project.enum';

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
}