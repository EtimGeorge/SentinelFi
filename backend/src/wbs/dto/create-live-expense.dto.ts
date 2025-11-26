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

  // User ID is NOT in the DTO body - it will be extracted from the JWT token (Phase 3) for security.

  @IsOptional()
  @IsDateString()
  expense_date?: Date; // Optional: Defaults to current date

  @IsNotEmpty()
  @IsString()
  item_description!: string; // ADDED !

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Actual unit cost must be a non-negative number." })
  actual_unit_cost!: number; // ADDED !

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01, { message: "Actual quantity must be greater than zero." })
  actual_quantity!: number; // ADDED !

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Commitment/LPO amount must be non-negative." })
  commitment_lpo_amount?: number;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Actual paid amount must be a non-negative number." })
  actual_paid_amount!: number; // ADDED !

  @IsOptional()
  @IsString()
  @MaxLength(255)
  document_reference?: string;

  @IsOptional()
  @IsString()
  notes_justification?: string;
}
