import { IsOptional, IsString, IsEnum, IsDateString, IsIn } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { ProjectStatus } from "../enums/project.enum";

/**
 * Whitelisted sort columns for GET /projects. MUST stay in sync with the
 * column names referenced by ProjectsService.findAll — this is the
 * injection guard for the dynamic `project.${sortBy}` ORDER BY.
 */
export const PROJECT_SORT_COLUMNS = [
  "project_name",
  "status",
  "created_at",
  "updated_at",
  "contract_value",
  "total_budgeted_rollup",
  "total_paid_rollup",
  "total_inflow_rollup",
] as const;

export class GetProjectsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  /** Unified free-text search across name and description (used by GlobalSearch). */
  search?: string;

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
  @IsIn(PROJECT_SORT_COLUMNS)
  sortBy?: string = "project_name";

  @IsOptional()
  @IsString()
  @IsIn(["ASC", "DESC"])
  sortOrder?: "ASC" | "DESC" = "ASC";

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
