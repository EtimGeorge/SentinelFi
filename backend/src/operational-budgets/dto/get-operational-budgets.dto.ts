import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsUUID,
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import {
  OperationalBudgetType,
  OperationalBudgetStatus,
} from "../enums/operational-budget.enum";

export class GetOperationalBudgetsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(OperationalBudgetType)
  type?: OperationalBudgetType;

  @IsOptional()
  @IsEnum(OperationalBudgetStatus)
  status?: OperationalBudgetStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  created_by_user_id?: string;
}
