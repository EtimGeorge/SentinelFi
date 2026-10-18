import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsUUID,
  MaxLength,
  ValidateIf,
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

  /**
   * GL account approved expenses in this category are debited to. Pass `null`
   * to clear the mapping and go back to the default expense account.
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  gl_account_id?: string | null;
}
