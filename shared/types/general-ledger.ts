// shared/types/general-ledger.ts
//
// General Ledger — double-entry journal + chart-of-accounts primitives.
//
// The chart of accounts is a 3-level hierarchy:
//   AccountClass (ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE base type)
//     -> AccountGroup ("Payroll & Benefits")
//       -> GLAccount ("Software Subscriptions", code 5130)
//
// Journal entries are double-entry: every POSTED entry must have
// sum(debit) == sum(credit) and at least two lines.

export enum AccountClassType {
  ASSET = "ASSET",
  LIABILITY = "LIABILITY",
  EQUITY = "EQUITY",
  REVENUE = "REVENUE",
  EXPENSE = "EXPENSE",
}

/**
 * Accounts in ASSET/EXPENSE classes carry a natural DEBIT balance; the
 * remaining classes (LIABILITY/EQUITY/REVENUE) carry a natural CREDIT
 * balance. Used to interpret a signed account balance as a "normal side"
 * figure for trial balance and ledger displays.
 */
export enum NormalBalance {
  DEBIT = "DEBIT",
  CREDIT = "CREDIT",
}

export const ACCOUNT_CLASS_NORMAL_BALANCE: Record<AccountClassType, NormalBalance> =
  {
    [AccountClassType.ASSET]: NormalBalance.DEBIT,
    [AccountClassType.EXPENSE]: NormalBalance.DEBIT,
    [AccountClassType.LIABILITY]: NormalBalance.CREDIT,
    [AccountClassType.EQUITY]: NormalBalance.CREDIT,
    [AccountClassType.REVENUE]: NormalBalance.CREDIT,
  };

export enum JournalEntryStatus {
  /** Draft entries may be edited/finalised; they never affect balances. */
  DRAFT = "DRAFT",
  /** Posted entries are immutable and affect account balances. */
  POSTED = "POSTED",
  /** Voided by a reversing entry; retained for audit but excluded. */
  VOID = "VOID",
}

/**
 * Identifies the business document that produced a journal entry. Used for
 * idempotency (at most one POSTED entry per tenant+sourceType+sourceId) and
 * for drill-down. MANUAL entries carry no source document.
 */
export enum JournalSourceType {
  MANUAL = "MANUAL",
  PAYROLL = "PAYROLL",
  OPEX_EXPENSE = "OPEX_EXPENSE",
  PURCHASE_ORDER = "PURCHASE_ORDER",
  GOODS_RECEIPT = "GOODS_RECEIPT",
  VENDOR_INVOICE = "VENDOR_INVOICE",
  REVERSAL = "REVERSAL",
}
