import { AccountClassType } from "../../../shared/types/general-ledger";

export interface DefaultGlAccount {
  name: string;
  code: string;
  description?: string;
}

export interface DefaultAccountGroup {
  name: string;
  code: string;
  accounts: DefaultGlAccount[];
}

export interface DefaultAccountClass {
  name: string;
  code: string;
  baseType: AccountClassType;
  groups: DefaultAccountGroup[];
}

/**
 * Baseline chart of accounts seeded (idempotently) for every tenant the first
 * time the GL/COA features are used. Codes are grouped in the conventional
 * ranges: 1xxx assets, 2xxx liabilities, 3xxx equity, 4xxx revenue,
 * 5xxx expenses. Tenants may rename/deactivate but the well-known liability
 * codes (2120/2130/2140) are relied on by automatic payroll posting.
 */
export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccountClass[] = [
  {
    name: "Assets",
    code: "1000",
    baseType: AccountClassType.ASSET,
    groups: [
      {
        name: "Current Assets",
        code: "1100",
        accounts: [
          { name: "Cash and Bank", code: "1110" },
          { name: "Accounts Receivable", code: "1120" },
          { name: "Prepaid Expenses", code: "1130" },
          { name: "Inventory", code: "1140" },
        ],
      },
    ],
  },
  {
    name: "Liabilities",
    code: "2000",
    baseType: AccountClassType.LIABILITY,
    groups: [
      {
        name: "Current Liabilities",
        code: "2100",
        accounts: [
          { name: "Accounts Payable", code: "2110" },
          {
            name: "Payroll Payable",
            code: "2120",
            description:
              "Net payroll obligation to employees. Auto-credited when a payroll run is posted.",
          },
          {
            name: "Tax Payable",
            code: "2130",
            description:
              "Employer payroll taxes owed. Auto-credited when a payroll run is posted.",
          },
          {
            name: "Benefits Payable",
            code: "2140",
            description:
              "Employer benefit contributions owed. Auto-credited when a payroll run is posted.",
          },
          {
            name: "Retention Payable",
            code: "2150",
            description:
              "Retainage withheld from contractor invoices until final acceptance. Auto-credited when a vendor invoice is posted.",
          },
        ],
      },
    ],
  },
  {
    name: "Equity",
    code: "3000",
    baseType: AccountClassType.EQUITY,
    groups: [
      {
        name: "Owners' Equity",
        code: "3100",
        accounts: [
          { name: "Owner's Capital", code: "3110" },
          { name: "Retained Earnings", code: "3120" },
        ],
      },
    ],
  },
  {
    name: "Revenue",
    code: "4000",
    baseType: AccountClassType.REVENUE,
    groups: [
      {
        name: "Operating Revenue",
        code: "4100",
        accounts: [
          { name: "Operating Revenue", code: "4110" },
          { name: "Other Income", code: "4120" },
        ],
      },
    ],
  },
  {
    name: "Operating Expenses",
    code: "5000",
    baseType: AccountClassType.EXPENSE,
    groups: [
      {
        name: "Payroll & Benefits",
        code: "5100",
        accounts: [
          { name: "Salaries and Wages", code: "5110" },
          { name: "Employer Taxes", code: "5120" },
          { name: "Employer Benefits", code: "5130" },
          { name: "Bonuses and Commissions", code: "5140" },
        ],
      },
      {
        name: "Operating Expenses",
        code: "5200",
        accounts: [
          { name: "Software Subscriptions", code: "5210" },
          { name: "Professional Services", code: "5220" },
          { name: "Office and Admin", code: "5230" },
          { name: "Travel and Entertainment", code: "5240" },
          { name: "General and Sundry", code: "5290" },
        ],
      },
    ],
  },
];

/**
 * Well-known account codes used by automatic posting. Centralised so the
 * posting code and the seed data cannot silently drift apart.
 */
export const SYSTEM_ACCOUNT_CODES = {
  PAYROLL_PAYABLE: "2120",
  TAX_PAYABLE: "2130",
  BENEFITS_PAYABLE: "2140",
  ACCOUNTS_PAYABLE: "2110",
  RETENTION_PAYABLE: "2150",
  CASH_AND_BANK: "1110",
  GENERAL_EXPENSE: "5290",
} as const;
