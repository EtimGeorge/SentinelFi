import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsDateString,
  IsEnum,
} from "class-validator";
import { PeriodType } from "../operational-budget-period-allocation.entity";

export class UpsertAllocationDto {
  @IsUUID()
  @IsNotEmpty()
  operational_budget_category_id!: string;

  @IsDateString()
  @IsNotEmpty()
  period_date!: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  amount!: number;

  @IsEnum(PeriodType)
  period_type!: PeriodType;
}