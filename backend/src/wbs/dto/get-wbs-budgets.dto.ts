import { IsOptional, IsString, IsUUID, IsIn, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto'; // Reverted to backend-internal DTO
import { WbsBudgetStatus } from '@shared/types/wbs-budget-status.enum'; // Import from shared

export class GetWbsBudgetsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  wbsCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(WbsBudgetStatus)
  status?: WbsBudgetStatus;

  @IsOptional()
  @IsUUID()
  categoryId?: string; // NEW: Filtering by category ID

  @IsOptional()
  @IsString()
  sortBy?: string = "created_at";

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = "DESC";

  // NEW: Filtering by project ID
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
