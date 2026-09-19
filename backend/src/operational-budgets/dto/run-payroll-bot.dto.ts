import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class PayrollBotTemplateItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  employee_name!: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  base_salary!: number;

  @IsUUID()
  @IsNotEmpty()
  operational_budget_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  employee_id?: string;

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
}

export class RunPayrollBotDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PayrollBotTemplateItemDto)
  template!: PayrollBotTemplateItemDto[];
}