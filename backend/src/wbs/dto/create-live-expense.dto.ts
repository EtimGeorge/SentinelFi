import {
  IsUUID,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  IsDateString,
} from "class-validator";

/**
 * DTO for the Live Expense Entry (Write Operation)
 * Strictly constrained to the Assigned Project User role.
 */
export class CreateLiveExpenseDto {
  @IsNotEmpty()
  @IsUUID("4", {
    message:
      "WBS ID must be a valid UUID v4 and link to an existing budget line.",
  })
  wbs_id!: string; // ADDED !

  @IsOptional()
  @IsUUID("4")
  project_id?: string; // NEW: Project ID

  // User ID is NOT in the DTO body - it will be extracted from the JWT token (Phase 3) for security.

  @IsOptional()
  @IsDateString()
  expense_date?: Date; // Optional: Defaults to current date

  @IsNotEmpty()
  @IsString()
  description!: string; // Renamed from item_description

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Unit cost must be a non-negative number." })
  unit_cost!: number; // Renamed from actual_unit_cost

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01, { message: "Quantity must be greater than zero." })
  quantity!: number; // Renamed from actual_quantity

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Commitment/LPO amount must be non-negative." })
  commitment_lpo_amount?: number;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Amount must be a non-negative number." })
  amount!: number; // Renamed from actual_paid_amount

  @IsOptional()
  @IsString()
  @MaxLength(255)
  document_reference?: string;

  @IsOptional()
  @IsString()
  notes_justification?: string;
}
