import {
  IsUUID,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  IsEnum, // NEW
} from "class-validator";
import { WbsBudgetStatus } from "../../../../shared/types/wbs-budget-status.enum"; // NEW

/**
 * DTO for creating a new WBS/Budget Line Item Draft.
 * Used by the Assigned Project User (Draft Only) and the Finance Officer (Final Draft).
 */
export class CreateWbsBudgetDto {
  @IsUUID("4")
  @IsNotEmpty()
  project_id!: string; // NEW: Project ID to link WBS to a specific project

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

  @IsOptional()
  @IsUUID("4")
  category_id?: string; // NEW: Category ID to link WBS to a specific category

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Days budgeted must be a non-negative number." })
  days_budgeted!: number; // Renamed from duration_days_budgeted

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Total cost budgeted must be a non-negative number." })
  total_cost_budgeted!: number; // NEW: Total cost budgeted

  @IsOptional()
  @IsEnum(WbsBudgetStatus) // NEW
  status?: WbsBudgetStatus; // NEW

  @IsOptional()
  @IsUUID("4")
  user_id?: string;
}
