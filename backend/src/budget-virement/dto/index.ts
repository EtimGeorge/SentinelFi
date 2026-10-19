import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsIn,
  MaxLength,
} from "class-validator";

export class CreateBudgetVirementDto {
  @IsUUID()
  @IsNotEmpty()
  operational_budget_id!: string;

  @IsUUID()
  @IsNotEmpty()
  source_category_id!: string;

  @IsUUID()
  @IsNotEmpty()
  destination_category_id!: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class SubmitVirementDto {
  @IsUUID()
  @IsNotEmpty()
  virement_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}

export class ApproveVirementDto {
  @IsUUID()
  @IsNotEmpty()
  virement_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}

export class VirementQueryDto {
  @IsOptional()
  @IsUUID()
  operational_budget_id?: string;

  @IsOptional()
  @IsIn(["DRAFT", "PENDING", "APPROVED", "REJECTED", "APPLIED", "CANCELLED"])
  status?: string;
}
