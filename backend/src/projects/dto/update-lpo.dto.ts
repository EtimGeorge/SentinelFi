import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
} from "class-validator";

/**
 * In-place edits permitted on a lodged LPO. Financial fields
 * (amount_committed, lpo_number, project_id, wbs_id) are intentionally
 * immutable after creation to preserve the commitment audit trail.
 */
export class UpdateLpoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  vendor_name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsDateString()
  expected_delivery_date?: string;
}