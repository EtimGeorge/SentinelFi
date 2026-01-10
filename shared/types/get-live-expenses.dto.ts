// shared/types/get-live-expenses.dto.ts
import { PaginationDto } from './pagination.dto'; // Assuming PaginationDto is also in shared

export enum VarianceFlag {
  NO_VARIANCE = 'NO_VARIANCE',
  NEGATIVE_VARIANCE = 'NEGATIVE_VARIANCE',
  POSITIVE_VARIANCE = 'POSITIVE_VARIANCE',
  MAJOR_VARIANCE_OVERRUN = 'MAJOR_VARIANCE_OVERRUN',
  MAJOR_VARIANCE_UNBUDGETED = 'MAJOR_VARIANCE_UNBUDGETED',
  OVER_BUDGET = 'OVER_BUDGET',
  WITHIN_BUDGET = 'WITHIN_BUDGET',
}

export interface GetLiveExpensesDto extends PaginationDto {
  wbsId?: string;
  userId?: string;
  varianceFlag?: VarianceFlag;
  startDate?: string;
  endDate?: string;
  description?: string; // Correct property name
  minAmount?: number;
  maxAmount?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  projectId?: string;
}
