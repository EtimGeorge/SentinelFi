// shared/types/encumbrance-status.enum.ts
//
// Phase 4 — Encumbrance & Control (4.1 lifecycle):
//   RESERVED   — soft-hold raised on a requisition / pending expense
//   FIRM       — commitment firmed at purchase-order / approval time
//   LIQUIDATED — realised as actual spend at payment/settlement
//   RELEASED   — hold cancelled (rejection, cancellation, reversal)

export enum EncumbranceStatus {
  RESERVED = "RESERVED",
  FIRM = "FIRM",
  LIQUIDATED = "LIQUIDATED",
  RELEASED = "RELEASED",
}

export enum EncumbranceSourceType {
  EXPENSE = "EXPENSE",
  REQUISITION = "REQUISITION",
  PURCHASE_ORDER = "PURCHASE_ORDER",
}