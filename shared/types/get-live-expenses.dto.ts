import { PaginationDto } from './pagination.dto';
import { VarianceFlag } from './variance-flag.enum';

export { VarianceFlag };

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
