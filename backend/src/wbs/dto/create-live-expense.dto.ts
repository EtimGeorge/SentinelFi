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
 * Uses a "Senior Authorizer Override" mechanism for budget overruns.
 */
export class CreateLiveExpenseDto {
  @IsNotEmpty()
  @IsUUID("4", {
    message:
      "WBS ID must be a valid UUID v4 and link to an existing budget line.",
  })
  wbs_id!: string;

  @IsOptional()
  @IsUUID("4")
  project_id?: string;

  @IsOptional()
  @IsUUID("4")
  category_id?: string; // Optional direct category tag for reporting

  @IsOptional()
  @IsDateString()
  expense_date?: Date;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Unit cost must be a non-negative number." })
  unit_cost!: number;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01, { message: "Quantity must be greater than zero." })
  quantity!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01, { message: "Days must be greater than zero." })
  days?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Commitment/LPO amount must be non-negative." })
  commitment_lpo_amount?: number;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: "Amount must be a non-negative number." })
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  document_reference?: string;

  @IsOptional()
  @IsString()
  notes_justification?: string;

  /**
   * SENIOR AUTHORIZER OVERRIDE:
   * Required when the expense amount causes a CRITICAL_VARIANCE (>= 10% budget overrun).
   * Must be provided by a user with CFO, CEO, or AdminDirector role.
   * Absence of this field on a critical overrun results in a HARD BLOCK (403).
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  override_reason?: string;
}
