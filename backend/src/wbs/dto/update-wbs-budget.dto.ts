import { PartialType } from '@nestjs/mapped-types';
import { CreateWbsBudgetDto } from './create-wbs-budget.dto';

/**
 * DTO for updating an existing WBS/Budget Line Item.
 * Extends the Create DTO and marks all fields as optional.
 */
export class UpdateWbsBudgetDto extends PartialType(CreateWbsBudgetDto) {}
