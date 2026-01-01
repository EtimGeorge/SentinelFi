import { PartialType } from '@nestjs/mapped-types';
import { CreateLiveExpenseDto } from './create-live-expense.dto';

/**
 * DTO for updating an existing Live Expense Entry.
 * Extends the Create DTO and marks all fields as optional.
 */
export class UpdateLiveExpenseDto extends PartialType(CreateLiveExpenseDto) {}
