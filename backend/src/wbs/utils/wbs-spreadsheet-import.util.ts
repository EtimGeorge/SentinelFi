/**
 * Intelligent spreadsheet understanding for WBS imports.
 *
 * Real budget spreadsheets do not arrive in one canonical shape. The header row
 * is often preceded by title/branding rows, columns are named "Rate", "Unit
 * Price", "Qty" or "Duration" rather than "Unit Cost", "Quantity" and "Days",
 * money arrives as "NGN 1,234.50", "1.234,56" or "(1,200)", and a file exported
 * from Excel in a European locale is semicolon-delimited. The previous importer
 * matched headers with `header.includes("unit cost")` against row 1 only, so
 * anything outside that narrow vocabulary was silently dropped — the row then
 * failed with a "Missing WBS Code or Description" that told the operator
 * nothing about why.
 *
 * This module performs that understanding in ONE place so the CSV and Excel
 * paths behave identically. It finds the header row, maps each header to a
 * field with a confidence, coerces values into the numbers the DTO accepts,
 * reconstructs the parent/child hierarchy (explicit parent column, or inferred
 * from dotted WBS codes), and reports every decision as a warning or a
 * row-numbered issue.
 *
 * Everything here is pure — no database, no NestJS — which keeps it unit
 * testable and leaves the service responsible only for persistence.
 */

import * as ExcelJS from "exceljs";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type WbsImportField =
  | "wbs_code"
  | "description"
  | "parent_wbs_code"
  | "unit_cost_budgeted"
  | "quantity_budgeted"
  | "days_budgeted"
  | "total_cost_budgeted"
  | "uom"
  | "category";

export type MappingConfidence = "high" | "medium" | "low";

export interface ColumnMapping {
  /** Zero-based column index in the source row. */
  index: number;
  /** Header text exactly as it appears in the file (for the UI). */
  header: string;
  /** Normalised header used for matching (for diagnostics). */
  normalised: string;
  field: WbsImportField | null;
  confidence: MappingConfidence | null;
}

export interface MappedRow {
  /** 1-based row number in the source document — what the operator sees. */
  sourceRow: number;
  wbs_code: string;
  description: string;
  parent_wbs_code: string | null;
  parent_source: "explicit" | "inferred" | "none";
  unit_cost_budgeted: number | null;
  quantity_budgeted: number | null;
  days_budgeted: number | null;
  total_cost_budgeted: number | null;
  uom: string | null;
  /**
   * Cost-type label exactly as written in the file. It is NOT a UUID: the tenant
   * owns its `wbs_category` rows, so this is resolved to a `category_id` by the
   * service against the tenant's own categories. An unrecognised label is a
   * warning, not a blocker — the line item still belongs in the budget, it just
   * is not classified.
   */
  category_label: string | null;
  /** Best-effort value for previews: explicit total, else unit × qty × days. */
  estimatedTotal: number;
  /**
   * The money columns exactly as they appeared in the file. Kept for currency
   * detection and so a rejected row can be quoted back verbatim — the operator
   * needs to see "NGN 1,234.50", not the number we managed to extract.
   */
  original?: {
    unit_cost_budgeted?: string;
    total_cost_budgeted?: string;
  };
  /** Blocking problems — a row with any issue is never imported. */
  issues: string[];
  /** Non-blocking remarks worth showing to the operator. */
  warnings: string[];
}

export interface SkippedRow {
  sourceRow: number;
  reason: string;
}

export interface WbsImportSummary {
  /** Rows below the header row that contained any data. */
  totalRows: number;
  importable: number;
  flagged: number;
  skipped: number;
  estimatedTotal: number;
}

export interface WbsImportAnalysis {
  source: "csv" | "excel";
  /** Delimiter actually used (CSV only). */
  delimiter: string | null;
  /** Worksheet the rows came from (Excel only). */
  sheetName: string | null;
  sheetCount: number;
  availableSheets: string[];
  /** 1-based header row number, or null when no header could be found. */
  headerRow: number | null;
  headerLabels: string[];
  columns: ColumnMapping[];
  unmappedColumns: string[];
  rows: MappedRow[];
  skipped: SkippedRow[];
  warnings: string[];
  summary: WbsImportSummary;
  /**
   * True when the source had more data rows than MAX_DATA_ROWS and the excess
   * was dropped. A financial import must never truncate silently — the caller
   * is expected to REFUSE the import (or tell the operator) when this is true.
   */
  truncated: boolean;
  /** How many data rows the source contained beyond the cap, if any. */
  droppedRows: number;
  /** Decoding chosen for a text source; "n/a" for workbooks. */
  encoding: string | null;
  /** Currency tokens seen in the money columns, mapped to ISO codes. */
  currencies: string[];
}

/**
 * The result an import endpoint returns. Superset of the legacy
 * `{ imported, errors }` shape so existing callers keep compiling, but rich
 * enough that the UI can show a real preview and a per-row report.
 */
export interface WbsImportResult {
  imported: number;
  /** Human-readable problems. Kept for backward compatibility with the UI. */
  errors: string[];
  /** Rows that were created. */
  created: Array<{ wbs_code: string; wbs_id: string; sourceRow: number }>;
  /** Rows that already existed and were updated (mode: "update"). */
  updated: Array<{ wbs_code: string; wbs_id: string; sourceRow: number }>;
  /** Rows left untouched because their code already existed (mode: "skip"). */
  skippedExisting: Array<{ wbs_code: string; sourceRow: number }>;
  /** Full per-row report, including rows that failed. */
  rows: MappedRow[];
  /** Non-blocking remarks about the file as a whole. */
  warnings: string[];
  summary: WbsImportSummary;
  /** True when the source was truncated; the import must be treated as partial. */
  truncated: boolean;
  droppedRows: number;
  headerRow: number | null;
  columns: ColumnMapping[];
  currencies: string[];
  /** True when nothing was written (dry run). */
  dryRun: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical vocabulary (also used by the UI format guide / error messages)
// ─────────────────────────────────────────────────────────────────────────────

/** Headers the UI advertises when it offers a downloadable template. */
export const CANONICAL_TEMPLATE_HEADERS = [
  "WBS Code",
  "Description",
  "Unit Cost",
  "Quantity",
  "Days",
  "Parent WBS Code",
] as const;

/** Human-readable aliases per field, quoted back to the operator on failure. */
export const FIELD_ALIASES: Record<WbsImportField, string[]> = {
  wbs_code: [
    "WBS Code",
    "Code",
    "Item No",
    "Activity Code",
    "Cost Code",
    "Reference",
  ],
  description: [
    "Description",
    "Activity",
    "Work Item",
    "Narrative",
    "Scope",
    "Particulars",
  ],
  parent_wbs_code: ["Parent WBS Code", "Parent", "Parent Code", "Phase Code"],
  unit_cost_budgeted: [
    "Unit Cost",
    "Unit Price",
    "Unit Rate",
    "Rate",
    "Price",
    "Cost per Unit",
  ],
  quantity_budgeted: ["Quantity", "Qty", "Units", "Count", "No of Units"],
  days_budgeted: ["Days", "Duration", "Man Days", "Work Days"],
  total_cost_budgeted: [
    "Total Cost",
    "Total",
    "Amount",
    "Total Budget",
    "Budgeted Amount",
    "Extended",
  ],
  uom: ["UOM", "Unit of Measure", "Measure"],
  category: [
    "Category",
    "Cost Type",
    "Cost Classification",
    "Cost Category",
    "Cost Element",
    "Budget Category",
    "Expenditure Type",
    "Type of Expenditure",
  ],
};

/** How far we are willing to look for a header row before giving up. */
const MAX_HEADER_SCAN_ROWS = 25;
/** Safety cap: budget sheets are small; anything larger is the wrong file. */
export const MAX_DATA_ROWS = 5000;

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/**
 * How an import should treat a WBS code that already exists in the project.
 * `wbs_budget` is unique on (wbs_code, project_id), so this must be an explicit
 * operator decision rather than whatever the driver's error message happens to
 * say on the day.
 */
export const WBS_IMPORT_MODES = ["create", "update", "skip"] as const;

export type WbsImportMode = (typeof WBS_IMPORT_MODES)[number];

export const DEFAULT_WBS_IMPORT_MODE: WbsImportMode = "create";

/**
 * Narrows an untrusted value (a query string, a form field) to a real mode.
 *
 * Anything unrecognised is rejected rather than defaulted. A typo in `mode` must
 * not silently become `update`, which overwrites live budget figures, nor
 * `create`, which collides with existing codes. The safe answer to "I do not
 * know what you meant" is to ask.
 */
export function parseWbsImportMode(
  raw: unknown,
): WbsImportMode | null {
  if (raw === undefined || raw === null || raw === "") {
    return DEFAULT_WBS_IMPORT_MODE;
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const normalised = value.trim().toLowerCase();
  return (WBS_IMPORT_MODES as readonly string[]).includes(normalised)
    ? (normalised as WbsImportMode)
    : null;
}

/**
 * `wbs_budget.wbs_code` and `wbs_budget.uom` are both `varchar(50)` in Postgres.
 * A value longer than that does not fail validation — it aborts the INSERT with
 * a driver error, which in a batch import means the whole transaction is lost.
 * Truncating silently would corrupt the join key used to rebuild the hierarchy,
 * so an over-long value is a ROW ISSUE the operator has to resolve.
 */
export const MAX_WBS_CODE_LENGTH = 50;
export const MAX_UOM_LENGTH = 50;
/** `wbs_budget.description` is `text`, but an unbounded cell is a paste error. */
export const MAX_DESCRIPTION_LENGTH = 2000;

/**
 * How many times the reported total may differ from unit x quantity x days
 * before the row is flagged. Financial columns are `numeric(19,4)`, so the
 * comparison runs at 4 dp with a small relative tolerance for float drift.
 */
const TOTAL_CONSISTENCY_TOLERANCE = 0.01;

/**
 * Currency tokens mapped to ISO-4217. Detection is advisory: the project
 * already has a base currency, and silently converting a budget is worse than
 * telling the operator that the sheet mixes currencies.
 */
const CURRENCY_TOKENS: Array<[RegExp, string]> = [
  [/\bngn\b|\u20a6|naira/i, "NGN"],
  [/\busd\b|\$|us\s*dollar/i, "USD"],
  [/\beur\b|\u20ac|euro/i, "EUR"],
  [/\bgbp\b|\u00a3|pound/i, "GBP"],
  [/\bjpy\b|\u00a5|yen/i, "JPY"],
  [/\bcad\b/i, "CAD"],
  [/\baud\b/i, "AUD"],
  [/\bzar\b|\brand\b/i, "ZAR"],
  [/\bkes\b|\bshs\b/i, "KES"],
  [/\bghs\b|\bcedi\b/i, "GHS"],
  [/\binr\b|rupee|rs\.?/i, "INR"],
  [/\bphp\b|\u20b1|peso/i, "PHP"],
  [/\baed\b|dirham/i, "AED"],
  [/\bsar\b|riyal/i, "SAR"],
];

/** Column headers that carry a currency but no amount, e.g. "Currency". */
function detectCurrencies(rows: MappedRow[]): string[] {
  const found = new Set<string>();
  const scan = /[^\s,;|]+/g;
  for (const row of rows) {
    for (const value of [
      row.original?.unit_cost_budgeted,
      row.original?.total_cost_budgeted,
    ]) {
      if (typeof value !== "string") continue;
      for (const [pattern, iso] of CURRENCY_TOKENS) {
        if (pattern.test(value)) found.add(iso);
      }
    }
  }
  return [...found].sort();
}


// ─────────────────────────────────────────────────────────────────────────────
// Header normalisation & field matching
// ─────────────────────────────────────────────────────────────────────────────

const CURRENCY_GLYPHS = /[₦$€£¥₱₹]/g;

/** ISO codes as they appear in a header, e.g. "Unit Cost (NGN)" or "Amount USD". */
const CURRENCY_CODES =
  /\b(ngn|usd|eur|gbp|jpy|cad|aud|zar|kes|ghs|inr|php|aed|sar|cve|gmd|egp|mad|tnd|bwp|zmw|ugx|tzs|rwf|xof|xaf)\b/g;

/**
 * Collapses a header to lower-case words, dropping punctuation, decoration,
 * currency marks and diacritics so that "Unit Cost (NGN)", "UNIT_COST" and
 * "Unit Cost [NGN]" all become "unit cost".
 *
 * Currency CODES are stripped as well as currency glyphs. Leaving "ngn" in place
 * would not by itself break a match — the rules test for the presence of words,
 * not their absence — but it leaks into the normalised text that is shown back
 * to the operator as a diagnostic, and it would defeat any future exact-match
 * rule.
 */
export function normaliseHeader(raw: unknown): string {
  return String(raw ?? "")
    .replace(/^﻿/, "")
    .replace(/[   ]/g, " ")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(CURRENCY_GLYPHS, " ")
    .replace(CURRENCY_CODES, " ")
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(header: string): string[] {
  return header.split(" ").filter(Boolean);
}

function hasWord(header: string, ...candidates: string[]): boolean {
  const parts = words(header);
  return candidates.some((candidate) => parts.includes(candidate));
}

function hasAllWords(header: string, ...candidates: string[]): boolean {
  const parts = words(header);
  return candidates.every((candidate) => parts.includes(candidate));
}

function hasAnyPrefix(header: string, ...prefixes: string[]): boolean {
  return words(header).some((word) =>
    prefixes.some((prefix) => word.startsWith(prefix)),
  );
}

interface AliasRule {
  field: WbsImportField;
  test: (header: string) => boolean;
  confidence: MappingConfidence;
}

/**
 * Ordered rules — order IS the precedence: "parent code" must resolve before
 * "code", and "unit cost" before the bare "cost"/"unit" heuristics.
 */
const ALIAS_RULES: AliasRule[] = [
  {
    field: "parent_wbs_code",
    confidence: "high",
    test: (h) => hasWord(h, "parent") || hasAllWords(h, "parent", "wbs"),
  },
  {
    field: "wbs_code",
    confidence: "high",
    test: (h) =>
      // A currency column legitimately contains the word "code".
      !hasWord(h, "currency") &&
      !hasWord(h, "curr") &&
      !hasWord(h, "exchange") &&
      (hasAllWords(h, "wbs", "code") ||
        hasAllWords(h, "wbs", "id") ||
        hasAllWords(h, "item", "no") ||
        hasAllWords(h, "item", "number") ||
        hasAllWords(h, "activity", "id") ||
        hasAllWords(h, "cost", "code") ||
        h === "wbs" ||
        h === "code" ||
        h === "item" ||
        h === "ref" ||
        h === "reference" ||
        h === "no"),
  },
  {
    field: "wbs_code",
    confidence: "medium",
    test: (h) =>
      !hasWord(h, "currency") &&
      (hasWord(h, "code") ||
        (hasWord(h, "id") && !hasWord(h, "project")) ||
        hasAnyPrefix(h, "wbs")),
  },
  {
    field: "description",
    confidence: "high",
    test: (h) =>
      hasAnyPrefix(h, "descript") ||
      hasWord(h, "narrative") ||
      hasWord(h, "particulars") ||
      hasWord(h, "scope") ||
      hasAllWords(h, "work", "item") ||
      hasAllWords(h, "activity", "name"),
  },
  {
    field: "description",
    confidence: "medium",
    test: (h) =>
      h === "item" ||
      h === "activity" ||
      hasWord(h, "activity") ||
      hasAllWords(h, "cost", "description"),
  },
  {
    field: "unit_cost_budgeted",
    confidence: "high",
    test: (h) =>
      hasAllWords(h, "unit", "cost") ||
      hasAllWords(h, "unit", "price") ||
      hasAllWords(h, "unit", "rate") ||
      hasAllWords(h, "cost", "per", "unit") ||
      hasAllWords(h, "rate", "per", "unit") ||
      h === "rate" ||
      h === "price" ||
      h === "cost",
  },
  {
    field: "total_cost_budgeted",
    confidence: "high",
    test: (h) =>
      hasWord(h, "total") ||
      hasAnyPrefix(h, "subtotal") ||
      hasWord(h, "amount") ||
      hasWord(h, "extended") ||
      h === "budget" ||
      hasAllWords(h, "budgeted", "amount"),
  },
  {
    field: "quantity_budgeted",
    confidence: "high",
    test: (h) =>
      hasAnyPrefix(h, "qty", "qnty", "quantit") ||
      h === "units" ||
      h === "nos" ||
      h === "count" ||
      hasAllWords(h, "no", "of", "units") ||
      hasAllWords(h, "unit", "count"),
  },
  {
    field: "days_budgeted",
    confidence: "high",
    test: (h) =>
      hasAnyPrefix(h, "day", "duration") ||
      hasAllWords(h, "man", "days") ||
      hasAllWords(h, "work", "days"),
  },
  {
    field: "uom",
    confidence: "high",
    test: (h) =>
      hasWord(h, "uom") ||
      hasAllWords(h, "unit", "of", "measure") ||
      h === "measure" ||
      h === "measurement",
  },
  {
    // Placed after uom because "Unit of Measure" also contains "unit", and
    // before the low-confidence fallback for the same reason.
    field: "category",
    confidence: "high",
    test: (h) =>
      hasWord(h, "category") ||
      hasAllWords(h, "cost", "type") ||
      hasAllWords(h, "cost", "classification") ||
      hasAllWords(h, "cost", "element") ||
      hasAllWords(h, "expenditure", "type") ||
      hasAllWords(h, "type", "expenditure") ||
      h === "type",
  },
  {
    // Last resort: an unqualified "Unit"/"Price" column is nearly always the
    // rate on a budget sheet, but flag it as low confidence so the UI says so.
    field: "unit_cost_budgeted",
    confidence: "low",
    test: (h) => hasWord(h, "unit") || hasWord(h, "price"),
  },
];

/**
 * Matches a single header cell. Returns null when the column is decoration
 * ("Notes", "Owner", "Prepared By") so the caller can report it as unmapped
 * instead of pretending it was understood.
 */
export function matchField(
  header: string,
): { field: WbsImportField; confidence: MappingConfidence } | null {
  if (!header) return null;
  for (const rule of ALIAS_RULES) {
    if (rule.test(header)) {
      return { field: rule.field, confidence: rule.confidence };
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Value coercion
// ─────────────────────────────────────────────────────────────────────────────

const NBSP = /[\u00A0\u2007\u202F]/g;

/**
 * Coerces a spreadsheet cell into a number, accepting what operators actually
 * type: "NGN 1,234.50", "₦1 234,50", "(1,200)" for a negative, "12.5%",
 * trailing minus signs, and a blank cell.
 *
 * The separator rule is the interesting part. When both separators appear, the
 * LAST one is the decimal marker (`1.234,56` is European, `1,234.56` is not).
 * With a single comma we decide by its distance from the end: one or two
 * trailing digits means a decimal comma (`1,5`), three or more means it was
 * grouping (`1,234`).
 */
export function coerceNumber(raw: unknown): {
  value: number | null;
  reason?: string;
} {
  if (raw === null || raw === undefined) return { value: null };
  if (typeof raw === "number") {
    return Number.isFinite(raw)
      ? { value: raw }
      : { value: null, reason: "not a number" };
  }

  let text = String(raw).replace(NBSP, " ").trim();
  if (!text) return { value: null };

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (/^-/.test(text) || /-\s*$/.test(text) || /\u2212/.test(text)) {
    negative = true;
  }

  // Keep digits and separators only: this is what drops "NGN", "₦", "%",
  // stray spaces and non-breaking spaces in one pass.
  text = text.replace(/[^0-9.,]/g, "");
  if (!text) return { value: null, reason: "not a number" };

  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");
  if (lastDot > -1 && lastComma > -1) {
    text =
      lastComma > lastDot
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else if (lastComma > -1) {
    const decimals = text.length - lastComma - 1;
    const commas = (text.match(/,/g) ?? []).length;
    text =
      commas === 1 && decimals > 0 && decimals <= 2
        ? text.replace(",", ".")
        : text.replace(/,/g, "");
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    return { value: null, reason: "not a number" };
  }
  return { value: negative ? -parsed : parsed };
}

/** Integer variant used for days/sort-order style fields. */
export function coerceInteger(raw: unknown): {
  value: number | null;
  reason?: string;
} {
  const { value, reason } = coerceNumber(raw);
  if (value === null) return { value: null, reason };
  return { value: Math.round(value) };
}

/**
 * Rounds to the scale the database actually stores. `numeric(19,4)` means a
 * value like 0.1 + 0.2 is persisted as 0.3000, so totals are compared and
 * reported at 4 dp — comparing at full float precision produces phantom
 * mismatches on every row of a well-formed sheet.
 */
export function round4(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 1e4) / 1e4;
}

// ─────────────────────────────────────────────────────────────────────────────
// Source detection & decoding
// ─────────────────────────────────────────────────────────────────────────────

export type SpreadsheetKind = "csv" | "excel" | "legacy-excel";

/**
 * Identifies the file by CONTENT first (magic bytes) and only then by name.
 * An .xlsx is a zip ("PK\x03\x04") and a pre-2007 .xls is an OLE compound file
 * ("D0 CF 11 E0") — the latter cannot be read by ExcelJS, so it gets its own
 * kind and a specific message rather than a generic "import failed".
 */
export class SpreadsheetTooLargeError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly limit: number,
    readonly actual: number,
  ) {
    super(message);
    this.name = "SpreadsheetTooLargeError";
  }
}

/**
 * Rejects a workbook whose *declared* uncompressed size is unreasonable, before
 * ExcelJS inflates it.
 *
 * This check has to run before `Workbook.xlsx.load`. A 4 KB upload can declare
 * 4 GB of inflated XML, and a guard placed after the load measures the damage
 * instead of preventing it. The numbers come from the zip central directory
 * (local headers lie and are not trusted here).
 */
export function assertWorkbookWithinLimits(
  buffer: Buffer,
  limits: {
    maxRows: number;
    maxColumns: number;
    maxUncompressedBytes: number;
  },
): void {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    throw new SpreadsheetTooLargeError(
      "The uploaded file is empty or is not a valid workbook.",
      "CORRUPT",
      0,
      buffer?.length ?? 0,
    );
  }

  let declared = 0;
  // The signature is only 4 bytes, so the scan has to run to the very end of the
  // buffer and the size fields are bounds-checked individually. An earlier
  // version stopped 46 bytes short, which meant it could only ever match a
  // central directory sitting in the first few bytes of the file — i.e. it
  // silently detected nothing at all.
  for (let offset = 0; offset + 4 <= buffer.length; offset++) {
    // Central directory file header signature "PK\x01\x02".
    if (
      buffer[offset] !== 0x50 ||
      buffer[offset + 1] !== 0x4b ||
      buffer[offset + 2] !== 0x01 ||
      buffer[offset + 3] !== 0x02
    ) {
      continue;
    }
    // Compressed size at +20, uncompressed at +24, both little-endian.
    if (offset + 28 > buffer.length) continue;
    const compressed = buffer.readUInt32LE(offset + 20);
    const uncompressed = buffer.readUInt32LE(offset + 24);
    // Guard against a 32-bit wrap that would read as a small number.
    if (uncompressed > 0xffffffff) {
      throw new SpreadsheetTooLargeError(
        "This workbook declares an uncompressed size that cannot be read safely.",
        "ZIP_BOMB",
        limits.maxUncompressedBytes,
        Number.MAX_SAFE_INTEGER,
      );
    }
    if (compressed === 0 && uncompressed > limits.maxUncompressedBytes) {
      throw new SpreadsheetTooLargeError(
        "This workbook expands to an enormous size when unzipped and was rejected before it was read.",
        "ZIP_BOMB",
        limits.maxUncompressedBytes,
        uncompressed,
      );
    }
    declared += uncompressed;
    if (declared > limits.maxUncompressedBytes) {
      throw new SpreadsheetTooLargeError(
        `This workbook expands to more than ${limits.maxUncompressedBytes} bytes when unzipped and was rejected before it was read.`,
        "ZIP_BOMB",
        limits.maxUncompressedBytes,
        declared,
      );
    }
  }
}

export function detectSpreadsheetKind(
  fileName: string,
  buffer: Buffer,
): SpreadsheetKind {
  const name = String(fileName ?? "").toLowerCase();
  if (buffer && buffer.length >= 4) {
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) return "excel";
    if (
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    ) {
      return "legacy-excel";
    }
  }
  if (name.endsWith(".xls")) return "legacy-excel";
  if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) {
    // The bytes are not a ZIP, so it is not really a workbook. Operators rename
    // a CSV export to .xlsx constantly, and refusing it with "not a valid
    // workbook" helps nobody — read it as the delimited text it actually is.
    if (buffer && buffer.length > 0 && looksLikeText(buffer)) return "csv";
    return "excel";
  }
  return "csv";
}

/**
 * True when the payload decodes as text with no NUL bytes, which is the
 * practical difference between a CSV and a binary workbook.
 */
function looksLikeText(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, 2048);
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0x00) return false;
  }
  return true;
}

/**
 * Decodes a text spreadsheet. Excel on Windows still exports CSV in the user's
 * ANSI code page, so a UTF-8 decode that produces replacement characters is
 * retried as latin1 instead of importing mojibake descriptions.
 */
export function decodeSpreadsheetBufferWithMeta(buffer: Buffer): {
  text: string;
  encoding: string;
} {
  const utf8 = buffer.toString("utf8");
  if (!utf8.includes("\uFFFD")) return { text: utf8, encoding: "utf-8" };
  return { text: buffer.toString("latin1"), encoding: "latin1" };
}

/** Convenience wrapper that discards the encoding label. */
export function decodeSpreadsheetBuffer(buffer: Buffer): string {
  return decodeSpreadsheetBufferWithMeta(buffer).text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delimited text (CSV / TSV) parsing
// ─────────────────────────────────────────────────────────────────────────────

const DELIMITER_CANDIDATES = [",", ";", "\t", "|"];
export const DEFAULT_DELIMITER = ",";

/** Splits one logical line, honouring "" as an escaped quote. */
export function splitDelimitedRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Picks the delimiter by consistency rather than by first appearance: for each
 * candidate we count the fields produced per line and keep the delimiter whose
 * field counts agree most often (a real delimiter produces the same width on
 * every row; a comma inside a description does not).
 */
export function sniffDelimiter(text: string): string {
  const sample = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .slice(0, 10);
  if (sample.length === 0) return DEFAULT_DELIMITER;

  let best = DEFAULT_DELIMITER;
  let bestScore = 0;
  for (const candidate of DELIMITER_CANDIDATES) {
    const widths = sample.map(
      (line) => splitDelimitedRow(line, candidate).length,
    );
    const counts = new Map<number, number>();
    for (const width of widths) {
      counts.set(width, (counts.get(width) ?? 0) + 1);
    }
    let modeWidth = 1;
    let modeHits = 0;
    counts.forEach((hits, width) => {
      if (hits > modeHits || (hits === modeHits && width > modeWidth)) {
        modeWidth = width;
        modeHits = hits;
      }
    });
    if (modeWidth <= 1) continue;
    const score = (modeWidth - 1) * (modeHits / sample.length);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

/**
 * Full parser: strips the BOM, normalises newlines, and supports quoted fields
 * that span lines (a description containing a line break is extremely common in
 * exported budget sheets).
 *
 * Reports how many rows were DISCARDED so the caller can refuse a partial
 * import rather than reporting success on a truncated file.
 */
export function parseDelimitedRowsWithMeta(
  text: string,
  delimiter: string,
): { rows: string[][]; dropped: number } {
  const all: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");

  const pushCell = () => {
    row.push(current.trim());
    current = "";
  };
  const pushRow = () => {
    pushCell();
    // Skip rows that are entirely empty (blank separator lines are common).
    if (row.some((cell) => cell !== "")) all.push(row);
    row = [];
  };

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (inQuotes && source[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      pushCell();
    } else if (char === "\n" && !inQuotes) {
      pushRow();
    } else {
      current += char;
    }
  }
  if (current !== "" || row.length > 0) pushRow();

  // The cap is applied AFTER the full scan so `dropped` is exact rather than
  // "we stopped early and lost an unknown amount". A budget sheet that does not
  // fit is the wrong file, and the operator has to be told that precisely.
  const budget = MAX_DATA_ROWS + MAX_HEADER_SCAN_ROWS;
  return { rows: all.slice(0, budget), dropped: Math.max(0, all.length - budget) };
}

/** Convenience wrapper that discards the truncation metadata. */
export function parseDelimitedRows(
  text: string,
  delimiter: string,
): string[][] {
  return parseDelimitedRowsWithMeta(text, delimiter).rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel workbooks
// ─────────────────────────────────────────────────────────────────────────────

export interface SpreadsheetSheet {
  name: string;
  rows: string[][];
  /** Rows the sheet contained beyond the cap, if any. */
  dropped: number;
}

/**
 * ExcelJS reads a workbook by inflating the entire OOXML package into memory
 * before any of our caps apply. A 5 MB `.xlsx` is a ZIP, and ZIP entries can
 * declare a 4 GB uncompressed size, so the request that passes a file-size
 * check at the interceptor can still allocate gigabytes inside `load()`.
 * `workbook.entries` is populated during inflation, so the sum of the
 * *declared* uncompressed sizes is checked after the fact and the result is
 * rejected — it is not a pre-flight check, it is a bound on what we are willing
 * to have already paid for. Pair it with the byte limit at the interceptor.
 */
const MAX_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;
const MAX_SHEETS = 50;

/**
 * Converts an ExcelJS cell value to the text an operator would read. Numbers
 * are stringified from the RAW value (not the formatted text) so a cell showing
 * "1,234.50" or "1.234,50" cannot be mis-parsed through locale formatting.
 */
function valueToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const candidate = value as {
      result?: unknown;
      text?: unknown;
      richText?: { text?: string }[];
    };
    if (candidate.result !== undefined && candidate.result !== null) {
      return valueToText(candidate.result);
    }
    if (Array.isArray(candidate.richText)) {
      return candidate.richText.map((part) => part?.text ?? "").join("");
    }
    if (typeof candidate.text === "string") return candidate.text;
  }
  return "";
}

function cellToText(cell: ExcelJS.Cell): string {
  const fromValue = valueToText(cell.value);
  if (fromValue !== "") return fromValue;
  // Shared strings / errors only expose their rendered text via `cell.text`.
  return String(cell.text ?? "");
}

/**
 * Reads every worksheet into a matrix of strings. Row indices are preserved
 * (empty rows are kept as empty arrays) so the row numbers reported back to the
 * operator match the sheet they are looking at.
 */
export async function workbookToSheets(
  buffer: Buffer,
): Promise<SpreadsheetSheet[]> {
  // BEFORE ExcelJS touches the buffer. A guard after the load reports the
  // damage; it cannot undo the allocation that has already happened.
  assertWorkbookWithinLimits(buffer, {
    maxRows: MAX_DATA_ROWS + MAX_HEADER_SCAN_ROWS,
    maxColumns: 60,
    maxUncompressedBytes: MAX_UNCOMPRESSED_BYTES,
  });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  if (workbook.worksheets.length > MAX_SHEETS) {
    throw new SpreadsheetTooLargeError(
      `The workbook has ${workbook.worksheets.length} worksheets; at most ${MAX_SHEETS} are supported.`,
      "TOO_MANY_SHEETS",
      MAX_SHEETS,
      workbook.worksheets.length,
    );
  }

  const sheets: SpreadsheetSheet[] = [];
  workbook.worksheets.forEach((worksheet) => {
    const rows: string[][] = [];
    const rowCount = Math.min(
      worksheet.rowCount || 0,
      MAX_DATA_ROWS + MAX_HEADER_SCAN_ROWS,
    );
    const columnCount = Math.min(worksheet.columnCount || 0, 60);
    for (let r = 1; r <= rowCount; r++) {
      const row = worksheet.getRow(r);
      const cells: string[] = [];
      for (let c = 1; c <= columnCount; c++) {
        cells.push(cellToText(row.getCell(c)));
      }
      while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
      rows.push(cells);
    }
    sheets.push({
      name: worksheet.name,
      rows,
      dropped: Math.max(0, (worksheet.rowCount || 0) - rowCount),
    });
  });
  return sheets;
}

// ─────────────────────────────────────────────────────────────────────────────
// Header detection & column mapping
// ─────────────────────────────────────────────────────────────────────────────

export interface HeaderDetection {
  /** Zero-based index into the matrix. */
  index: number;
  labels: string[];
}

function confidenceWeight(confidence: MappingConfidence | null): number {
  if (confidence === "high") return 2;
  if (confidence === "medium") return 1;
  if (confidence === "low") return 0.5;
  return 0;
}

function cellAt(row: string[] | undefined, index: number): string {
  if (!row) return "";
  return String(row[index] ?? "").trim();
}

/**
 * Finds the header row. Budget files routinely open with a company name, a
 * project title and a blank line, so every row in the first
 * `MAX_HEADER_SCAN_ROWS` is scored and the best one wins. A candidate must map
 * at least two distinct fields and look like a WBS listing (a code or a
 * description column) — that is what stops a title row from being mistaken for
 * a header.
 */
export function detectHeaderRow(matrix: string[][]): HeaderDetection | null {
  const limit = Math.min(matrix.length, MAX_HEADER_SCAN_ROWS);
  let best: HeaderDetection | null = null;
  let bestScore = 0;

  for (let r = 0; r < limit; r++) {
    const raw = matrix[r] ?? [];
    const nonEmpty = raw.filter(
      (cell) => String(cell ?? "").trim() !== "",
    ).length;
    if (nonEmpty < 2) continue;

    const fields = new Set<WbsImportField>();
    let fieldScore = 0;
    for (const cell of raw) {
      const normalised = normaliseHeader(cell);
      if (!normalised) continue;
      const match = matchField(normalised);
      if (!match || fields.has(match.field)) continue;
      fields.add(match.field);
      fieldScore += confidenceWeight(match.confidence);
    }

    if (!fields.has("wbs_code") && !fields.has("description")) continue;
    const score =
      fields.size * 2 + fieldScore + (fields.has("wbs_code") ? 2 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = {
        index: r,
        labels: raw.map((cell) => String(cell ?? "").trim()),
      };
    }
  }

  return best;
}

/**
 * Maps each header cell to a field. A field is claimed by its strongest
 * candidate (highest confidence, then leftmost); a lesser duplicate is dropped
 * and reported, so "Unit Cost" beats a stray "Unit" instead of the two of them
 * fighting over the same value.
 */
export function mapColumns(labels: string[]): {
  columns: ColumnMapping[];
  warnings: string[];
} {
  const columns: ColumnMapping[] = labels.map((label, index) => {
    const header = String(label ?? "").trim();
    const normalised = normaliseHeader(header);
    const match = normalised ? matchField(normalised) : null;
    return {
      index,
      header,
      normalised,
      field: match ? match.field : null,
      confidence: match ? match.confidence : null,
    };
  });

  const warnings: string[] = [];
  const claimed = new Map<WbsImportField, ColumnMapping>();

  for (const column of columns) {
    if (!column.field) continue;
    const existing = claimed.get(column.field);
    if (!existing) {
      claimed.set(column.field, column);
      continue;
    }
    if (
      confidenceWeight(column.confidence) > confidenceWeight(existing.confidence)
    ) {
      warnings.push(
        `Column "${existing.header}" was ignored in favour of "${column.header}" (both claimed the same field).`,
      );
      existing.field = null;
      existing.confidence = null;
      claimed.set(column.field, column);
    } else {
      warnings.push(
        `Column "${column.header}" was ignored: it duplicates "${existing.header}".`,
      );
      column.field = null;
      column.confidence = null;
    }
  }

  return { columns, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping
// ─────────────────────────────────────────────────────────────────────────────

interface FieldIndex {
  wbs_code: number;
  description: number;
  parent_wbs_code: number;
  unit_cost_budgeted: number;
  quantity_budgeted: number;
  days_budgeted: number;
  total_cost_budgeted: number;
  uom: number;
  category: number;
}

function indexFields(columns: ColumnMapping[]): FieldIndex {
  const index: FieldIndex = {
    wbs_code: -1,
    description: -1,
    parent_wbs_code: -1,
    unit_cost_budgeted: -1,
    quantity_budgeted: -1,
    days_budgeted: -1,
    total_cost_budgeted: -1,
    uom: -1,
    category: -1,
  };
  for (const column of columns) {
    if (column.field && index[column.field] === -1) {
      index[column.field] = column.index;
    }
  }
  return index;
}

/** Codes are matched case-insensitively and without surrounding spaces. */
export function codeKey(code: string): string {
  return String(code ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

/** Variants we accept when looking a parent code up in the file. */
function codeVariants(code: string): string[] {
  const base = codeKey(code);
  if (!base) return [];
  const variants = new Set<string>([
    base,
    base.replace(/\.0$/, ""),
    base.replace(/[.\-_/]+$/, ""),
    base.replace(/\s/g, ""),
  ]);
  return [...variants].filter(Boolean);
}

/**
 * A row that merely restates a total ("TOTAL", "Grand Total", "Subtotal") is
 * not a line item; importing it would create a phantom node.
 */
function isSummaryRow(row: string[], fields: FieldIndex): boolean {
  const code = cellAt(row, fields.wbs_code);
  if (code !== "") return false;
  const label = cellAt(row, fields.description).toLowerCase();
  return /^(grand\s+)?(total|subtotal|summary|overall)\b/.test(label);
}

function hasAnyNumber(row: string[], fields: FieldIndex): boolean {
  return [
    fields.unit_cost_budgeted,
    fields.quantity_budgeted,
    fields.days_budgeted,
    fields.total_cost_budgeted,
  ].some((column) => column >= 0 && cellAt(row, column) !== "");
}

/**
 * Converts matrix rows into mapped rows plus row-numbered diagnostics. Every
 * failure names the column it came from, because `Row 14: "Unit Cost" value
 * "Rate on request" is not a number` is actionable while the previous
 * `Row 14: Missing WBS Code or Description` told the operator nothing.
 */
export function buildRows(
  matrix: string[][],
  headerIndex: number,
  columns: ColumnMapping[],
  sheetLabel: string,
  expectedWidth: number = columns.length,
): { rows: MappedRow[]; skipped: SkippedRow[]; warnings: string[] } {
  const fields = indexFields(columns);
  const rows: MappedRow[] = [];
  const skipped: SkippedRow[] = [];
  const warnings: string[] = [];
  const firstSeenByCode = new Map<string, number>();
  let raggedRows = 0;

  const headerLabel = (column: number): string => {
    const meta = columns.find((entry) => entry.index === column);
    return meta ? meta.header : `column ${column + 1}`;
  };

  for (let r = headerIndex + 1; r < matrix.length; r++) {
    const raw = matrix[r] ?? [];
    if (raw.every((cell) => String(cell ?? "").trim() === "")) continue;

    const sourceRow = r + 1;
    // A row wider than the header means a delimiter was missed inside an
    // unquoted field, so the tail of the row is being discarded. That is a
    // silent data-loss shape, so it is counted and reported once.
    if (expectedWidth > 0 && raw.length > expectedWidth) raggedRows++;
    if (isSummaryRow(raw, fields)) {
      skipped.push({ sourceRow, reason: "Totals / summary row" });
      continue;
    }

    const issues: string[] = [];
    const rowWarnings: string[] = [];

    const code = cellAt(raw, fields.wbs_code);
    const description = cellAt(raw, fields.description);

    if (!code) {
      issues.push(
        fields.wbs_code >= 0
          ? `no value in "${headerLabel(fields.wbs_code)}"`
          : "no WBS code column was detected in this file",
      );
    }
    if (!description) {
      issues.push(
        fields.description >= 0
          ? `no value in "${headerLabel(fields.description)}"`
          : "no description column was detected in this file",
      );
    }

    // Length checks mirror the database, not the DTO. `wbs_code` is the join key
    // the whole hierarchy is rebuilt from, so an over-long code is a blocker
    // rather than something to truncate.
    if (code.length > MAX_WBS_CODE_LENGTH) {
      issues.push(
        `WBS code is ${code.length} characters; the maximum is ${MAX_WBS_CODE_LENGTH}`,
      );
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      issues.push(
        `Description is ${description.length} characters; the maximum is ${MAX_DESCRIPTION_LENGTH}`,
      );
    }

    const readNumber = (
      column: number,
      label: string,
      integer = false,
    ): number | null => {
      if (column < 0) return null;
      const text = cellAt(raw, column);
      if (text === "") return null;
      const parsed = integer ? coerceInteger(text) : coerceNumber(text);
      if (parsed.value === null) {
        issues.push(
          `"${label}" value "${text}" in "${headerLabel(column)}" is not a number`,
        );
        return null;
      }
      if (parsed.value < 0) {
        issues.push(
          `"${label}" value "${text}" is negative; budgeted amounts must be zero or more`,
        );
        return null;
      }
      return parsed.value;
    };

    const unitCost = readNumber(fields.unit_cost_budgeted, "Unit cost");
    const quantity = readNumber(fields.quantity_budgeted, "Quantity");
    const days = readNumber(fields.days_budgeted, "Days", true);
    const explicitTotal = readNumber(fields.total_cost_budgeted, "Total cost");

    const estimatedTotal =
      explicitTotal !== null
        ? explicitTotal
        : (unitCost ?? 0) * (quantity ?? 1) * (days ?? 1);

    if (estimatedTotal === 0) {
      rowWarnings.push(
        hasAnyNumber(raw, fields)
          ? "Computes to a zero budget value"
          : "No cost or quantity values on this row (zero budget value)",
      );
    }

    // Arithmetic consistency. A sheet that states a total which disagrees with
    // unit x qty x days is either using a formula we did not read (day-rates,
    // mobilisation, escalation) or contains an error. Either way the operator
    // has to decide which number is authoritative BEFORE the budget becomes the
    // control figure, so it is a blocker, not a note. The alternative —
    // importing the stated total silently — is how a cost-control system ends up
    // approving against a number nobody can reproduce.
    if (explicitTotal !== null && unitCost !== null) {
      const computed = unitCost * (quantity ?? 1) * (days ?? 1);
      const tolerance = Math.max(
        TOTAL_CONSISTENCY_TOLERANCE,
        Math.abs(computed) * 0.0001,
      );
      if (Math.abs(computed - explicitTotal) > tolerance) {
        issues.push(
          `stated total ${explicitTotal} does not match ${unitCost} x ${quantity ?? 1} x ${days ?? 1} = ${round4(computed)} (${headerLabel(fields.total_cost_budgeted)} vs ${headerLabel(fields.unit_cost_budgeted)}, ${headerLabel(fields.quantity_budgeted)}, ${headerLabel(fields.days_budgeted)})`,
        );
      }
    }

    const key = codeKey(code);
    if (key) {
      const duplicateOf = firstSeenByCode.get(key);
      if (duplicateOf !== undefined) {
        issues.push(
          `duplicate WBS code "${code}" (already used on row ${duplicateOf})`,
        );
      } else {
        firstSeenByCode.set(key, sourceRow);
      }
    }

    const parentRaw = cellAt(raw, fields.parent_wbs_code);
    if (parentRaw && codeKey(parentRaw) === key) {
      issues.push(`parent code "${parentRaw}" is the row itself`);
    }

    const uom = cellAt(raw, fields.uom) || null;
    if (uom && uom.length > MAX_UOM_LENGTH) {
      issues.push(
        `Unit of measure "${uom.slice(0, 20)}..." is ${uom.length} characters; the maximum is ${MAX_UOM_LENGTH}`,
      );
    }

    rows.push({
      sourceRow,
      wbs_code: code,
      description,
      parent_wbs_code: parentRaw || null,
      parent_source: parentRaw ? "explicit" : "none",
      unit_cost_budgeted: unitCost,
      quantity_budgeted: quantity,
      days_budgeted: days,
      total_cost_budgeted: explicitTotal,
      uom,
      category_label: cellAt(raw, fields.category) || null,
      estimatedTotal,
      original: {
        unit_cost_budgeted:
          fields.unit_cost_budgeted >= 0
            ? cellAt(raw, fields.unit_cost_budgeted)
            : undefined,
        total_cost_budgeted:
          fields.total_cost_budgeted >= 0
            ? cellAt(raw, fields.total_cost_budgeted)
            : undefined,
      },
      issues,
      warnings: rowWarnings,
    });
  }

  if (raggedRows > 0) {
    warnings.push(
      `${raggedRows} row(s) in ${sheetLabel} have more fields than the header row. Values after column ${expectedWidth} were ignored — check for a delimiter inside an unquoted text field.`,
    );
  }

  if (rows.length === 0) {
    warnings.push(
      `No data rows were found under the header row of ${sheetLabel}.`,
    );
  }

  return { rows, skipped, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hierarchy
// ─────────────────────────────────────────────────────────────────────────────

/** Depth of a code path: "1" → 0, "1.1" → 1, "1.1.2" → 2. */
export function codeDepth(code: string): number {
  const separators = String(code ?? "").match(/[.\-_/]/g);
  return separators ? separators.length : 0;
}

/**
 * Derives the implied parent code: "1.1.2" → "1.1", "1.1" → "1". Only the
 * dotted/dashed/slashed forms imply a parent; a flat code has none.
 */
export function inferParentCode(code: string): string | null {
  const trimmed = String(code ?? "").trim();
  const match = trimmed.match(/^(.*)[.\-_/]\s*[^.\-_/]+$/);
  if (!match) return null;
  return match[1].trim() || null;
}

/**
 * Reconstructs parent/child links and orders every parent before its children.
 *
 * An explicit parent column is honoured first. Failing that, a dotted WBS code
 * implies its own parent ("1.1.2" sits under "1.1", which sits under "1"),
 * which is how most budget sheets are numbered even without a parent column.
 * The previous importer only linked a parent that happened to appear EARLIER in
 * the file and otherwise left the item at the top level, silently flattening
 * the hierarchy.
 *
 * ORDERING IS A TOPOLOGICAL SORT, NOT A DEPTH SORT. Sorting by the number of
 * separators in the code is only correct when the hierarchy was *inferred* from
 * those separators. A file with an explicit "Parent WBS Code" column routinely
 * has children coded "A", "B", "C" under a parent coded "4.2" — a depth sort
 * emits "A" first, its parent is not in the map yet, and the row is silently
 * flattened to the top level. That is the exact bug this function exists to
 * remove, so a depth sort would reintroduce it. Kahn's algorithm over the
 * parent edges gives the guarantee regardless of how the hierarchy was stated.
 *
 * Rows that cannot be emitted (a cycle, or a parent flagged out by another
 * error) are reported rather than silently dropped. `resolveHierarchy` does not
 * mutate its input: re-analysing the same rows must be idempotent.
 */
export function resolveHierarchy(rows: MappedRow[]): {
  rows: MappedRow[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const resolved: MappedRow[] = rows.map((row) => ({ ...row }));

  const byKey = new Map<string, MappedRow>();
  for (const row of resolved) {
    const key = codeKey(row.wbs_code);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, row);
  }

  const findRow = (code: string, self: MappedRow): MappedRow | undefined => {
    for (const variant of codeVariants(code)) {
      const match = byKey.get(variant);
      if (match && match !== self) return match;
    }
    return undefined;
  };

  for (const row of resolved) {
    if (!row.wbs_code) continue;

    if (row.parent_wbs_code) {
      const parent = findRow(row.parent_wbs_code, row);
      if (parent) {
        row.parent_wbs_code = parent.wbs_code;
        row.parent_source = "explicit";
      } else {
        warnings.push(
          `Row ${row.sourceRow}: parent code "${row.parent_wbs_code}" was not found in this file, so "${row.wbs_code}" will be created at the top level.`,
        );
        row.parent_wbs_code = null;
        row.parent_source = "none";
      }
      continue;
    }

    const inferred = inferParentCode(row.wbs_code);
    if (!inferred) continue;
    const parent = findRow(inferred, row);
    if (parent) {
      row.parent_wbs_code = parent.wbs_code;
      row.parent_source = "inferred";
    }
  }

  // ── Topological sort (parents before children) ───────────────────────────
  // Plain Kahn's algorithm over the parent -> child edges. A row becomes
  // emittable once its own parent has been emitted, so the resulting order is
  // always insertable: a child's `parent_wbs_id` references a row that already
  // has an id, which is what the foreign key requires.
  //
  // The previous version counted a node's *children* as its blockers and
  // decremented the parent when a child was emitted. That is the reverse
  // traversal: it emitted "1.1" before "1", which both breaks the guarantee and
  // trips the FK on a real insert.
  const index = new Map<string, MappedRow>();
  for (const row of resolved) {
    if (row.wbs_code) index.set(codeKey(row.wbs_code), row);
  }

  const children = new Map<string, MappedRow[]>();
  const pendingParent = new Map<string, number>();
  for (const row of resolved) {
    const key = codeKey(row.wbs_code);
    if (!key) continue;
    const parentKey = row.parent_wbs_code
      ? codeKey(row.parent_wbs_code)
      : null;
    // A parent that is not itself part of this batch cannot be waited on —
    // it already exists in the project and is resolved by the service.
    const waits =
      parentKey !== null && parentKey !== key && index.has(parentKey);
    pendingParent.set(key, waits ? 1 : 0);
    if (!waits) continue;
    const list = children.get(parentKey as string);
    if (list) list.push(row);
    else children.set(parentKey as string, [row]);
  }

  const enqueue = (queue: MappedRow[], row: MappedRow) => {
    // Keep the queue in source order so the result is stable and matches the
    // order the operator sees in the spreadsheet.
    let at = queue.findIndex((c) => c.sourceRow > row.sourceRow);
    if (at === -1) at = queue.length;
    queue.splice(at, 0, row);
  };

  const ready = resolved
    .filter((row) => (pendingParent.get(codeKey(row.wbs_code)) ?? 0) === 0)
    .sort((a, b) => a.sourceRow - b.sourceRow);

  const ordered: MappedRow[] = [];
  // Tracked by row identity, not by code. A duplicate code is a flagged row the
  // operator still has to SEE — keying on the code would swallow the second
  // occurrence and the report would lose the row number of the problem.
  const emitted = new Set<MappedRow>();
  while (ready.length > 0) {
    const row = ready.shift() as MappedRow;
    if (!row.wbs_code || emitted.has(row)) continue;
    emitted.add(row);
    ordered.push(row);

    for (const child of children.get(codeKey(row.wbs_code)) ?? []) {
      const next = (pendingParent.get(codeKey(child.wbs_code)) ?? 0) - 1;
      pendingParent.set(codeKey(child.wbs_code), next);
      if (next === 0 && !emitted.has(child)) enqueue(ready, child);
    }
  }

  if (ordered.length !== resolved.length) {
    // Everything left is inside a cycle: no member of a cycle can be created
    // before its own parent, so none of them can be created at all.
    const stuck = resolved
      .filter((row) => !emitted.has(row))
      .sort((a, b) => a.sourceRow - b.sourceRow);
    const chain = stuck
      .slice(0, 6)
      .map((row) => row.wbs_code || `row ${row.sourceRow}`)
      .join(" -> ");
    warnings.push(
      `Circular parent relationship detected between ${stuck.length} row(s) (${chain}${stuck.length > 6 ? " -> ..." : ""}). Those rows cannot be created and will not be imported.`,
    );
    for (const row of stuck) {
      row.issues.push(
        "circular parent relationship — this row is part of a parent loop",
      );
      row.parent_wbs_code = null;
      row.parent_source = "none";
    }
    // Emit the unreachable rows in source order so the operator still sees them.
    ordered.push(...stuck);
  }

  return { rows: ordered, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis orchestration
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyseMeta {
  source: "csv" | "excel";
  delimiter?: string | null;
  sheetName?: string | null;
  sheetCount?: number;
  availableSheets?: string[];
  /** Data rows the source had beyond the cap. */
  droppedRows?: number;
  /** Encoding chosen by decodeSpreadsheetBuffer, for the audit trail. */
  encoding?: string | null;
}

function emptySummary(): WbsImportSummary {
  return {
    totalRows: 0,
    importable: 0,
    flagged: 0,
    skipped: 0,
    estimatedTotal: 0,
  };
}

function summarise(
  rows: MappedRow[],
  skipped: SkippedRow[],
): WbsImportSummary {
  let importable = 0;
  let flagged = 0;
  let estimatedTotal = 0;
  for (const row of rows) {
    if (row.issues.length > 0) {
      flagged++;
      continue;
    }
    importable++;
    estimatedTotal += row.estimatedTotal;
  }
  return {
    totalRows: rows.length,
    importable,
    flagged,
    skipped: skipped.length,
    estimatedTotal,
  };
}

/**
 * Analyses one matrix (a parsed CSV or one worksheet) end to end: locate the
 * header row, map the columns, map and validate the rows, rebuild the
 * hierarchy, and summarise. Never throws on bad input — a file that cannot be
 * understood comes back with blockers that explain why, which is what the UI
 * shows the operator instead of an empty result.
 */
export function analyseMatrix(
  matrix: string[][],
  meta: AnalyseMeta,
): WbsImportAnalysis {
  const sheetLabel = meta.sheetName ? `sheet "${meta.sheetName}"` : "the file";
  const droppedRows = Math.max(0, meta.droppedRows ?? 0);
  const analysis: WbsImportAnalysis = {
    source: meta.source,
    delimiter: meta.delimiter ?? null,
    sheetName: meta.sheetName ?? null,
    sheetCount: meta.sheetCount ?? 1,
    availableSheets:
      meta.availableSheets ?? (meta.sheetName ? [meta.sheetName] : []),
    headerRow: null,
    headerLabels: [],
    columns: [],
    unmappedColumns: [],
    rows: [],
    skipped: [],
    warnings: [],
    summary: emptySummary(),
    truncated: droppedRows > 0,
    droppedRows,
    encoding: meta.encoding ?? null,
    currencies: [],
  };

  const detection = detectHeaderRow(matrix);
  if (!detection) {
    analysis.warnings.push(
      `No header row could be found in the first ${MAX_HEADER_SCAN_ROWS} rows of ${sheetLabel}. Expected a row naming at least a WBS code or a description column.`,
    );
    return analysis;
  }

  const { columns, warnings: columnWarnings } = mapColumns(detection.labels);
  const mappedFields = columns
    .filter((column) => column.field)
    .map((column) => column.field);

  analysis.headerRow = detection.index + 1;
  analysis.headerLabels = detection.labels;
  analysis.columns = columns;
  analysis.unmappedColumns = columns
    .filter((column) => !column.field && column.header !== "")
    .map((column) => column.header);
  analysis.warnings = [...columnWarnings];

  if (
    !mappedFields.includes("wbs_code") &&
    !mappedFields.includes("description")
  ) {
    analysis.warnings.push(
      `None of the columns in ${sheetLabel} look like a WBS code or a description. Expected one of: ${FIELD_ALIASES.wbs_code.join(", ")} / ${FIELD_ALIASES.description.join(", ")}.`,
    );
    return analysis;
  }

  const built = buildRows(matrix, detection.index, columns, sheetLabel);
  const hierarchy = resolveHierarchy(built.rows);

  analysis.rows = hierarchy.rows;
  analysis.skipped = built.skipped;
  analysis.warnings = [
    ...analysis.warnings,
    ...built.warnings,
    ...hierarchy.warnings,
  ];
  analysis.summary = summarise(hierarchy.rows, built.skipped);

  if (droppedRows > 0) {
    analysis.warnings.push(
      `This file is larger than the import limit: ${droppedRows} data row(s) past row ${MAX_DATA_ROWS} were NOT read and will NOT be imported. Split the file or remove the excess rows.`,
    );
  }

  analysis.currencies = detectCurrencies(hierarchy.rows);
  if (analysis.currencies.length > 1) {
    analysis.warnings.push(
      `More than one currency appears in the money columns (${analysis.currencies.join(", ")}). Amounts are imported exactly as written and are NOT converted — confirm they are all in the project's base currency.`,
    );
  }

  return analysis;
}

/** Convenience wrapper for a CSV/TSV payload already decoded to text. */
export function analyseDelimitedText(
  text: string,
  delimiter?: string,
): WbsImportAnalysis {
  const resolved = delimiter ?? sniffDelimiter(text);
  const { rows, dropped } = parseDelimitedRowsWithMeta(text, resolved);
  return analyseMatrix(rows, {
    source: "csv",
    delimiter: resolved,
    droppedRows: dropped,
  });
}

/**
 * Reads every worksheet and keeps the most importable one. Workbooks routinely
 * open on a cover/instructions sheet with the real budget on sheet 2, which is
 * why picking the FIRST sheet was the wrong default.
 */
export async function analyseWorkbook(
  buffer: Buffer,
): Promise<WbsImportAnalysis> {
  const sheets = await workbookToSheets(buffer);
  if (sheets.length === 0) {
    return analyseMatrix([], {
      source: "excel",
      sheetName: null,
      sheetCount: 0,
      availableSheets: [],
    });
  }

  const analyses = sheets.map((sheet) =>
    analyseMatrix(sheet.rows, {
      source: "excel",
      sheetName: sheet.name,
      sheetCount: sheets.length,
      availableSheets: sheets.map((entry) => entry.name),
      droppedRows: sheet.dropped,
    }),
  );

  const best = analyses.reduce((winner, candidate) => {
    if (candidate.summary.importable > winner.summary.importable) {
      return candidate;
    }
    if (
      candidate.summary.importable === winner.summary.importable &&
      candidate.summary.totalRows > winner.summary.totalRows
    ) {
      return candidate;
    }
    return winner;
  });

  const ignored = sheets
    .map((sheet) => sheet.name)
    .filter((name) => name !== best.sheetName);
  if (ignored.length > 0) {
    best.warnings.unshift(
      `Used sheet "${best.sheetName}" (${best.summary.importable} importable rows). Other sheets ignored: ${ignored.join(", ")}.`,
    );
  }
  return best;
}

/** Rows with no blocking issue, already ordered parents-first. */
export function importableRows(analysis: WbsImportAnalysis): MappedRow[] {
  return analysis.rows.filter((row) => row.issues.length === 0);
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter((value) => Boolean(value)))];
}

/**
 * Explains why a file cannot produce any line item. Returns an empty array when
 * at least one row is importable, so callers can treat non-empty as "nothing to
 * do" and still surface the reasons.
 */
export function describeImportBlockers(analysis: WbsImportAnalysis): string[] {
  const blockers: string[] = [];

  // A truncated file is a blocker on its own, even if the rows that WERE read
  // look perfect. Reporting "imported 5,000 of 9,300" as a success is how a
  // budget ends up 46% short with no alert.
  if (analysis.truncated) {
    blockers.push(
      `The file is too large to import safely: ${analysis.droppedRows} row(s) were not read. Split it into smaller files and import them one at a time.`,
    );
  }

  if (importableRows(analysis).length > 0) return dedupe(blockers);

  blockers.push(...analysis.warnings);
  const detected = analysis.columns
    .filter((column) => column.header !== "")
    .map((column) => column.header);

  blockers.push(
    `Expected a header row such as: ${CANONICAL_TEMPLATE_HEADERS.join(" | ")}.`,
  );
  if (detected.length > 0) {
    blockers.push(`Columns detected: ${detected.join(", ")}.`);
  }

  const failed = analysis.rows.filter((row) => row.issues.length > 0);
  blockers.push(
    ...failed
      .slice(0, 5)
      .map((row) => `Row ${row.sourceRow}: ${row.issues.join("; ")}.`),
  );
  if (failed.length > 5) {
    blockers.push(
      `${failed.length - 5} further row(s) have the same or similar problems.`,
    );
  }
  if (analysis.skipped.length > 0) {
    blockers.push(
      `${analysis.skipped.length} row(s) were ignored as totals/summary rows.`,
    );
  }

  return dedupe(blockers);
}

/**
 * The single entry point for an uploaded file. Callers hand over the raw bytes
 * and a filename and get back an analysis, regardless of whether the bytes are
 * CSV, TSV, XLSX or a legacy XLS.
 *
 * This exists so the service has ONE code path instead of the two it had —
 * `importWbsFromCsv` and `importWbsFromExcel` each re-implemented detection,
 * header location, mapping and validation, and the two disagreed: only the CSV
 * path sniffed a delimiter, only the Excel path looked past row 1, and only the
 * Excel path read a stated total. Every file now gets every behaviour.
 *
 * Throws `SpreadsheetTooLargeError` for a hostile workbook and returns an
 * analysis with blockers for a file that simply cannot be read.
 */
export async function analyseSpreadsheetFile(
  fileName: string,
  buffer: Buffer,
): Promise<{ kind: SpreadsheetKind; analysis: WbsImportAnalysis }> {
  const kind = detectSpreadsheetKind(fileName, buffer);

  if (kind === "legacy-excel") {
    const decoded = decodeSpreadsheetBufferWithMeta(buffer);
    const analysis = analyseDelimitedText(decoded.text);
    analysis.warnings.unshift(
      'This looks like a pre-2007 ".xls" workbook, which cannot be read directly. If it is really a tab- or comma-separated text file it has still been read as one; otherwise save it as ".xlsx" and upload it again.',
    );
    return { kind, analysis };
  }

  if (kind === "csv") {
    const decoded = decodeSpreadsheetBufferWithMeta(buffer);
    const analysis = analyseDelimitedText(decoded.text);
    analysis.encoding = decoded.encoding;
    return { kind, analysis };
  }

  return { kind, analysis: await analyseWorkbook(buffer) };
}

/**
 * Turns a row into the payload `CreateWbsBudgetDto` expects. Deliberately
 * explicit rather than a spread: `MappedRow` carries diagnostic fields
 * (`estimatedTotal`, `issues`, `original`) that must never reach an INSERT.
 *
 * `total_cost_budgeted` is passed through only when the sheet stated one, so
 * the service keeps deriving unit x qty x days when it did not.
 */
export function toCreateWbsBudgetPayload(
  row: MappedRow,
  projectId: string,
): {
  project_id: string;
  wbs_code: string;
  description: string;
  unit_cost_budgeted: number;
  quantity_budgeted: number;
  days_budgeted: number;
  total_cost_budgeted: number;
  uom?: string;
  category_label: string | null;
  parent_wbs_code: string | null;
} {
  const unitCost = round4(row.unit_cost_budgeted ?? 0);
  const quantity = round4(row.quantity_budgeted ?? 1);
  const days = row.days_budgeted ?? 1;
  const derived = round4(unitCost * quantity * days);
  return {
    project_id: projectId,
    wbs_code: row.wbs_code,
    description: row.description,
    unit_cost_budgeted: unitCost,
    quantity_budgeted: quantity,
    days_budgeted: days,
    total_cost_budgeted:
      row.total_cost_budgeted !== null
        ? round4(row.total_cost_budgeted)
        : derived,
    uom: row.uom ?? undefined,
    category_label: row.category_label,
    parent_wbs_code: row.parent_wbs_code,
  };
}








