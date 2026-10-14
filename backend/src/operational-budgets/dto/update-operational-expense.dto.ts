import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsNumber,
  IsPositive,
  Max,
  IsDate,
  IsUUID,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { OperationalExpenseStatus } from "../operational-expense.entity";

export class UpdateOperationalExpenseDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  item_description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(9999999999)
  amount?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expense_date?: Date;

  @IsOptional()
  @IsUUID()
  operational_budget_category_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  vendor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  receipt_url?: string;

  // `status` is retained for the guarded correction workflow
  // (enforceExpenseStatusTransition enforces SoD + override roles).
  // `variance_flag` is deliberately NOT client-settable — it is derived by
  // the service from budget thresholds and must never be overwritten via PATCH.
  @IsOptional()
  @IsEnum(OperationalExpenseStatus)
  status?: OperationalExpenseStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  override_reason?: string;
}
