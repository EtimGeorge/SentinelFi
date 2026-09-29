import { IsOptional, IsDateString, IsUUID } from "class-validator";

export class GetOpexAnalyticsDto {
  /**
   * Raw date window. Ignored when `fiscalYearId` is supplied — the fiscal year
   * is the authoritative window and resolves to its own start/end dates.
   */
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  /**
   * Fiscal-year selector. Resolved server-side to `fiscal_year.start_date` /
   * `end_date` so the client never has to know the calendar.
   */
  @IsOptional()
  @IsUUID()
  fiscalYearId?: string;

  /**
   * Cost-center selector. Resolved to its owning department and applied as a
   * department filter — `operational_budget` is department-scoped and has no
   * cost-center column (see OperationalBudgetEntity.department_id).
   */
  @IsOptional()
  @IsUUID()
  costCenterId?: string;
}
