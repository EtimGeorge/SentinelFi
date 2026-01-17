import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsDateString,
  MaxLength,
} from "class-validator";
import {
  OperationalBudgetType,
  OperationalBudgetStatus,
} from "../enums/operational-budget.enum";

export class CreateOperationalBudgetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(OperationalBudgetType)
  @IsNotEmpty()
  type!: OperationalBudgetType;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  @IsNotEmpty()
  budgeted_amount!: number;

  @IsDateString()
  @IsNotEmpty()
  start_date!: Date;

  @IsDateString()
  @IsNotEmpty()
  end_date!: Date;

  @IsOptional()
  @IsEnum(OperationalBudgetStatus)
  status?: OperationalBudgetStatus;

  @IsOptional()
  @IsString()
  department_id?: string; // Optional: for departmental budgets
}
