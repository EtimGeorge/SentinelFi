import { IsOptional, IsString, IsEnum, IsDateString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { ProjectStatus } from "../enums/project.enum";

export class GetProjectsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  project_name?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsString()
  client_id?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = "project_name";

  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC" = "ASC";

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
