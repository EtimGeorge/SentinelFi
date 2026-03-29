import { Type } from "class-transformer";
import {
  IsArray,
  IsNotEmpty,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { CreateLiveExpenseDto } from "./create-live-expense.dto";

/**
 * Batch DTO for logging multiple expense line items atomically (all-or-nothing transaction).
 */
export class CreateLiveExpenseBatchDto {
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1, { message: "At least one expense entry is required." })
  @ArrayMaxSize(100, {
    message: "Cannot submit more than 100 expense entries at once.",
  })
  @ValidateNested({ each: true })
  @Type(() => CreateLiveExpenseDto)
  entries!: CreateLiveExpenseDto[];
}
