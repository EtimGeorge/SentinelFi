/**
 * DEPRECATED — single authoritative entity lives at
 * `src/ai-assistant/report-schedule.entity.ts` (table `ai_report_schedule`).
 *
 * This file is kept only so old imports don't break. It re-exports the
 * canonical entity and its enums. Do NOT define a second @Entity here —
 * duplicate class names with different tables cause TypeORM confusion.
 *
 * Migration note: if a `report_schedule` table exists from the old model,
 * migrate its rows into `ai_report_schedule` (mapping: name -> name,
 * filters -> filters, is_active true -> status ACTIVE else PAUSED) then drop
 * the old table. See docs/ai-implementation-progress.md.
 */
export {
  ReportScheduleEntity,
  ReportFrequency,
  ReportStatus,
} from "../../ai-assistant/report-schedule.entity";

/** @deprecated Use ReportFrequency from ai-assistant/report-schedule.entity */
export { ReportFrequency as ScheduleFrequency } from "../../ai-assistant/report-schedule.entity";
