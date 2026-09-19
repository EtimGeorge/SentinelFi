import {
  IsUUID,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  Min,
  IsOptional,
  IsDate,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { PayrollEntryStatus } from "../payroll-entry.entity";

export class LogPayrollEntryDto {
  @IsUUID()
  @IsNotEmpty()
  operational_budget_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  employee_name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  employee_id?: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  base_salary!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  bonus?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  overtime?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  other_allowances?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  pension_deduction?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  tax_deduction?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  net_pay?: number;

  @IsDate()
  @Type(() => Date)
  pay_period_start!: Date;

  @IsDate()
  @Type(() => Date)
  pay_period_end!: Date;

  @IsDate()
  @Type(() => Date)
  payment_date!: Date;

  @IsOptional()
  @IsEnum(PayrollEntryStatus)
  status?: PayrollEntryStatus;
}