import {
  IsUUID,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  IsEnum,
} from "class-validator";
import { WbsBudgetStatus } from "../../../../shared/types/wbs-budget-status.enum";

/**
 * DTO for creating a new WBS/Budget Line Item Draft.
 * The server auto-computes total_cost_budgeted = unit_cost × quantity × days
 * unless total_cost_budgeted is explicitly provided as an override.
 */
export class CreateWbsBudgetDto {
  @IsUUID("4")
  @IsNotEmpty()
  project_id!: string;

  @IsOptional()
  @IsUUID("4", {
    message: "Parent WBS ID must be a valid UUID v4 or null for the root.",
  })
  parent_wbs_id?: string | null;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  wbs_code!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Unit cost must be a non-negative number." })
  unit_cost_budgeted?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Quantity must be a non-negative number." })
  quantity_budgeted?: number;

  @IsOptional()
  @IsUUID("4")
  category_id?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Days budgeted must be a non-negative number." })
  days_budgeted?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Total cost budgeted must be a non-negative number." })
  total_cost_budgeted?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  uom?: string;

  @IsOptional()
  custom_metadata?: Record<string, any>;

  @IsOptional()
  @IsEnum(WbsBudgetStatus)
  status?: WbsBudgetStatus;

  @IsOptional()
  @IsUUID("4")
  user_id?: string;
}
