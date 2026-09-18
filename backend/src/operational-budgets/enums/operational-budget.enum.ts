// Canonical OPEX enums — must stay in sync with shared/types/operational-budget.ts.
// Any change here MUST be mirrored with a DB migration that alters the Postgres
// enum types (public + tenant schemas) BEFORE this value is written.
export enum OperationalBudgetType {
  COMPANY_WIDE = "company_wide",
  DEPARTMENTAL = "departmental",
  PROJECT_SPECIFIC = "project_specific",
  RECURRING = "recurring",
}

export enum OperationalBudgetStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}
