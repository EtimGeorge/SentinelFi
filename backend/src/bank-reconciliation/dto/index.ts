import {
  IsUUID,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsNumber,
  IsPositive,
  IsOptional,
  IsDateString,
  IsIn,
} from "class-validator";
import { Transform } from "class-transformer";

/**
 * Coerces numeric form fields: trims, maps "" -> undefined, and parses
 * numeric strings to numbers so a form's empty/serialized input does not
 * trip @IsNumber. Non-numeric values pass through untouched so @IsNumber
 * still rejects them with a clear message.
 */
const toOptionalNumber = ({ value }: { value: unknown }): unknown => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
};

export class CreateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  account_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  account_number_masked!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  bank_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency_code?: string;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  opening_balance?: number;

  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE", "CLOSED"])
  status?: string;
}

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  account_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bank_name?: string;

  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE", "CLOSED"])
  status?: string;
}

export class CreateBankStatementLineDto {
  @IsUUID()
  @IsNotEmpty()
  bank_account_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  statement_reference!: string;

  @IsDateString()
  transaction_date!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @Transform(toOptionalNumber)
  @IsNumber({ maxDecimalPlaces: 4 })
  amount!: number;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber({ maxDecimalPlaces: 4 })
  balance_after?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference_number?: string;
}

export class CreateReconciliationDto {
  @IsUUID()
  @IsNotEmpty()
  bank_account_id!: string;

  @IsDateString()
  reconciliation_date!: string;

  @Transform(toOptionalNumber)
  @IsNumber({ maxDecimalPlaces: 4 })
  statement_balance!: number;

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber({ maxDecimalPlaces: 4 })
  book_balance?: number;
}

export class MatchReconciliationLineDto {
  @IsUUID()
  @IsNotEmpty()
  reconciliation_id!: string;

  @IsUUID()
  @IsNotEmpty()
  bank_statement_line_id!: string;

  @Transform(toOptionalNumber)
  @IsNumber({ maxDecimalPlaces: 4 })
  amount!: number;

  @IsOptional()
  @IsIn(["AUTO", "MANUAL"])
  match_type?: string;
}

export class ApproveReconciliationDto {
  @IsUUID()
  @IsNotEmpty()
  reconciliation_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}

export class PostReconciliationDto {
  @IsUUID()
  @IsNotEmpty()
  reconciliation_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}

export class ReconciliationQueryDto {
  @IsOptional()
  @IsUUID()
  bank_account_id?: string;

  @IsOptional()
  @IsIn(["OPEN", "MATCHED", "APPROVED", "POSTED", "CANCELLED"])
  status?: string;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;
}
