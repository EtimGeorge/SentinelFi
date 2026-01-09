import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ProjectStatus } from '../enums/project.enum';

export class GetProjectsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  project_name?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  // Add other filters as needed, e.g., created_by_user_id
}