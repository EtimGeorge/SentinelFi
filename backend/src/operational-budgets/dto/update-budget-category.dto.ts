import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  MaxLength,
} from "class-validator";
import { BudgetCategoryType } from "../budget-category.entity";

export class UpdateBudgetCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(BudgetCategoryType)
  type?: BudgetCategoryType;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}