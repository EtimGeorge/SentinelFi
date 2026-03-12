export enum VarianceFlag {
  NO_VARIANCE = 'NO_VARIANCE',
  MINOR_VARIANCE = 'MINOR_VARIANCE',
  MAJOR_VARIANCE = 'MAJOR_VARIANCE',
  CRITICAL_VARIANCE = 'CRITICAL_VARIANCE',        // >= 10% overrun - requires CFO/CEO override
  UNAPPROVED_BUDGET_USAGE = 'UNAPPROVED_BUDGET_USAGE', // WBS node not APPROVED
  OVERRIDE_APPLIED = 'OVERRIDE_APPLIED',           // Senior authorizer approved the overrun
}
