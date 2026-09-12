import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  MaxLength,
} from "class-validator";

export class CreateLpoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lpo_number?: string;

  @IsUUID()
  @IsNotEmpty()
  project_id!: string;

  @IsUUID()
  @IsNotEmpty()
  wbs_id!: string;

  @IsString()
  @IsNotEmpty()
  vendor_name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01, { message: "Committed amount must be greater than zero." })
  amount_committed!: number;

  @IsDateString()
  @IsOptional()
  expected_delivery_date?: string;

  /**
   * SENIOR AUTHORIZER OVERRIDE:
   * Required when an LPO commitment would cause a CRITICAL_VARIANCE on its WBS line.
   * If provided by CFO/CEO/Admin Director the LPO is approved inline; otherwise it is
   * routed to the PENDING_APPROVAL queue.
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  override_reason?: string;
}