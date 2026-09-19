import { GetOperationalBudgetsDto } from "./get-operational-budgets.dto";

/**
 * Query shape for GET /operational-budgets/export.
 * `format` (csv | pdf | xlsx | docx) is already declared on the base DTO.
 */
export class OperationalBudgetExportQueryDto extends GetOperationalBudgetsDto {}