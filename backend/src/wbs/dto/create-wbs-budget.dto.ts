import {
  IsUUID,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
} from "class-validator";

/**
 * DTO for creating a new WBS/Budget Line Item Draft.
 * Used by the Assigned Project User (Draft Only) and the Finance Officer (Final Draft).
 */
export class CreateWbsBudgetDto {
  @IsOptional()
  @IsUUID("4", {
    message: "Parent WBS ID must be a valid UUID v4 or null for the root.",
  })
  parent_wbs_id?: string | null;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  wbs_code!: string; // ADDED !

  @IsNotEmpty()
  @IsString()
  description!: string; // ADDED !

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Unit cost must be a non-negative number." })
  unit_cost_budgeted!: number; // ADDED !

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01, { message: "Quantity must be greater than zero." })
  quantity_budgeted!: number; // ADDED !

  @IsOptional()
  @IsNumber()
  @Min(0, { message: "Duration must be a non-negative number." })
  duration_days_budgeted?: number | null;
}
