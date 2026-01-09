import { IsOptional, IsString, IsUUID, IsEnum, IsDateString, IsNumber, IsIn } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum VarianceFlag {
  NO_VARIANCE = 'NO_VARIANCE',
  NEGATIVE_VARIANCE = 'NEGATIVE_VARIANCE',
  POSITIVE_VARIANCE = 'POSITIVE_VARIANCE',
  MAJOR_VARIANCE_OVERRUN = 'MAJOR_VARIANCE_OVERRUN',
  MAJOR_VARIANCE_UNBUDGETED = 'MAJOR_VARIANCE_UNBUDGETED',
  OVER_BUDGET = 'OVER_BUDGET', // Added to align with service logic
  WITHIN_BUDGET = 'WITHIN_BUDGET', // Added to align with service logic
}

export class GetLiveExpensesDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  wbsId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(VarianceFlag)
  varianceFlag?: VarianceFlag;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString() // ADDED BACK
  endDate?: string; // ADDED BACK

  @IsOptional()
  @IsString()
  description?: string; // Renamed from itemDescription

  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @IsOptional()
  @IsString()
  sortBy?: string = "created_at";

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = "DESC";

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
