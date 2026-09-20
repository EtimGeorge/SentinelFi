// shared/types/variance-classification.enum.ts
//
// Phase 4 — variance classification (4.5):
//   TIMING_VARIANCE  — overrun that is expected to unwind within the plan
//                      (spend shifted across periods; budget-level headroom).
//   PERMANENT_VARIANCE — structural overspend that will persist through the
//                      fiscal cycle and require an override/refunding.

export enum VarianceClassification {
  TIMING_VARIANCE = "TIMING_VARIANCE",
  PERMANENT_VARIANCE = "PERMANENT_VARIANCE",
}