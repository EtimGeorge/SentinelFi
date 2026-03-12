export class WbsValidationResultDto {
  isValid: boolean = true;
  conflicts: {
    type: 'DUPLICATE_CODE' | 'BUDGET_OVERRUN' | 'HIERARCHY_MISMATCH' | 'PROJECT_MISMATCH';
    severity: 'CRITICAL' | 'WARNING';
    message: string;
    details?: any;
  }[] = [];
  summary?: string;
}
