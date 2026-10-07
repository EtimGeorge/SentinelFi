import {
  analyseDelimitedText,
  analyseMatrix,
  assertWorkbookWithinLimits,
  SpreadsheetTooLargeError,
  buildRows,
  coerceInteger,
  coerceNumber,
  codeDepth,
  codeKey,
  decodeSpreadsheetBufferWithMeta,
  detectHeaderRow,
  detectSpreadsheetKind,
  importableRows,
  inferParentCode,
  mapColumns,
  matchField,
  normaliseHeader,
  parseDelimitedRowsWithMeta,
  parseWbsImportMode,
  resolveHierarchy,
  round4,
  sniffDelimiter,
  splitDelimitedRow,
  toCreateWbsBudgetPayload,
  MAX_DATA_ROWS,
  MAX_WBS_CODE_LENGTH,
  type MappedRow,
} from "./wbs-spreadsheet-import.util";

const CANONICAL_HEADER = [
  "WBS Code",
  "Description",
  "Unit Cost",
  "Quantity",
  "Days",
  "Total Cost",
];

const matrix = (...rows: string[][]): string[][] => rows;

describe("normaliseHeader", () => {
  it("collapses decoration, case, diacritics and currency glyphs", () => {
    expect(normaliseHeader("UNIT_COST")).toBe("unit cost");
    expect(normaliseHeader("Unit Cost (NGN)")).toBe("unit cost");
    expect(normaliseHeader("Ünïté  Coût")).toBe("unite cout");
    expect(normaliseHeader("  Unit Cost  ")).toBe("unit cost");
    expect(normaliseHeader("")).toBe("");
    expect(normaliseHeader(null)).toBe("");
  });
});

describe("matchField", () => {
  it("prefers the parent column over the bare code column", () => {
    // Precedence is load-bearing: a sheet with both "WBS Code" and
    // "Parent WBS Code" must not map the parent to the child's code.
    expect(matchField("parent wbs code")?.field).toBe("parent_wbs_code");
    expect(matchField("wbs code")?.field).toBe("wbs_code");
  });

  it("does not treat a currency column as a code column", () => {
    expect(matchField("currency code")?.field).not.toBe("wbs_code");
  });

  it("recognises the common budget vocabulary", () => {
    expect(matchField("unit rate")?.field).toBe("unit_cost_budgeted");
    expect(matchField("qty")?.field).toBe("quantity_budgeted");
    expect(matchField("duration")?.field).toBe("days_budgeted");
    expect(matchField("uom")?.field).toBe("uom");
    expect(matchField("cost type")?.field).toBe("category");
  });

  it("returns null for decoration so it can be reported as unmapped", () => {
    expect(matchField("prepared by")).toBeNull();
    expect(matchField("")).toBeNull();
  });
});

describe("coerceNumber", () => {
  it("reads the separator conventions operators actually use", () => {
    expect(coerceNumber("1,234.56").value).toBeCloseTo(1234.56, 4);
    expect(coerceNumber("1.234,56").value).toBeCloseTo(1234.56, 4);
    expect(coerceNumber("1234").value).toBe(1234);
  });

  it("decides a lone comma by how many digits follow it", () => {
    // One or two trailing digits is a decimal comma; three or more was grouping.
    expect(coerceNumber("1,5").value).toBeCloseTo(1.5, 4);
    expect(coerceNumber("1,23").value).toBeCloseTo(1.23, 4);
    expect(coerceNumber("1,234").value).toBe(1234);
  });

  it("strips currency decoration and reads negatives in every notation", () => {
    expect(coerceNumber("NGN 1,234.50").value).toBeCloseTo(1234.5, 4);
    expect(coerceNumber("\u20a61,234.50").value).toBeCloseTo(1234.5, 4);
    expect(coerceNumber("(1,200)").value).toBe(-1200);
    expect(coerceNumber("-1200").value).toBe(-1200);
    expect(coerceNumber("1200-").value).toBe(-1200);
  });

  it("returns null for blank and non-numeric input, with a reason", () => {
    expect(coerceNumber("").value).toBeNull();
    expect(coerceNumber("   ").value).toBeNull();
    expect(coerceNumber(null).value).toBeNull();
    expect(coerceNumber("Rate on request").reason).toBe("not a number");
  });

  it("rounds to an integer for day counts", () => {
    expect(coerceInteger("5.6").value).toBe(6);
    expect(coerceInteger("abc").value).toBeNull();
  });
});

describe("round4", () => {
  it("matches the numeric(19,4) scale the database stores", () => {
    expect(round4(0.1 + 0.2)).toBe(0.3);
    expect(round4(1234.56789)).toBe(1234.5679);
    expect(round4(Number.NaN)).toBe(0);
  });
});

describe("splitDelimitedRow / sniffDelimiter", () => {
  it("honours escaped quotes", () => {
    expect(splitDelimitedRow('a,"b,c",d', ",")).toEqual(["a", "b,c", "d"]);
    expect(splitDelimitedRow('a,"say ""hi""",d', ",")).toEqual([
      "a",
      'say "hi"',
      "d",
    ]);
  });

  it("detects a semicolon export rather than splitting on decimal commas", () => {
    const euro = [
      "WBS Code;Description;Unit Cost;Total Cost",
      "1.0;Phase one;1.234,56;1.234,56",
      "1.1;Phase two;2.000,00;2.000,00",
    ].join("\n");
    expect(sniffDelimiter(euro)).toBe(";");
  });

  it("defaults to a comma when there is no consistent structure", () => {
    expect(sniffDelimiter("just\nsome\nprose")).toBe(",");
  });
});

describe("parseDelimitedRowsWithMeta", () => {
  it("keeps a quoted value that spans lines as one row", () => {
    const { rows } = parseDelimitedRowsWithMeta(
      'A,"line one\nline two"\nB,"simple"',
      ",",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0][1]).toBe("line one\nline two");
    expect(rows[1][1]).toBe("simple");
  });

  it("reports how many rows were dropped instead of truncating silently", () => {
    // A financial import must never quietly lose the tail of a budget.
    const budget = MAX_DATA_ROWS + 25;
    const lines = ["WBS Code,Description"];
    for (let i = 0; i < budget + 40; i++) lines.push(`${i},Row ${i}`);
    const { rows, dropped } = parseDelimitedRowsWithMeta(lines.join("\n"), ",");
    // The cap covers the header-scan allowance plus the data allowance, and the
    // header line is itself one of the rows counted against it.
    expect(rows).toHaveLength(budget);
    expect(dropped).toBe(41);
  });
});

describe("detectSpreadsheetKind", () => {
  it("trusts the bytes over the filename", () => {
    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
    expect(detectSpreadsheetKind("budget.csv", zip)).toBe("excel");
    const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0x00]);
    expect(detectSpreadsheetKind("budget.xlsx", ole)).toBe("legacy-excel");
  });

  it("reads a CSV that was renamed to .xlsx as the text it actually is", () => {
    // Operators rename CSV exports constantly; "not a valid workbook" helps
    // nobody, and the bytes are authoritative anyway.
    expect(detectSpreadsheetKind("budget.xlsx", Buffer.from("a,b\n1,2"))).toBe(
      "csv",
    );
    expect(detectSpreadsheetKind("budget.csv", Buffer.from("a,b\n1,2"))).toBe(
      "csv",
    );
  });
});

describe("decodeSpreadsheetBufferWithMeta", () => {
  it("keeps valid UTF-8 and falls back to latin1 only when it has to", () => {
    expect(decodeSpreadsheetBufferWithMeta(Buffer.from("caf\u00e9", "utf8"))).toEqual(
      { text: "caf\u00e9", encoding: "utf-8" },
    );
    const windows = Buffer.from([0x63, 0x61, 0x66, 0xe9]);
    const decoded = decodeSpreadsheetBufferWithMeta(windows);
    expect(decoded.encoding).toBe("latin1");
    expect(decoded.text).toBe("caf\u00e9");
  });
});

describe("detectHeaderRow", () => {
  it("skips the title and blank rows budget files open with", () => {
    const found = detectHeaderRow(
      matrix(
        ["ACME CONSTRUCTION LTD"],
        [],
        ["Project Budget FY2026"],
        [],
        CANONICAL_HEADER,
        ["1.0", "Phase one", "100", "1", "1", "100"],
      ),
    );
    expect(found?.index).toBe(4);
  });

  it("returns null when nothing looks like a header", () => {
    expect(detectHeaderRow(matrix(["just", "prose"], ["more", "text"]))).toBeNull();
  });
});

describe("mapColumns", () => {
  it("gives a field to its strongest claim and reports the loser", () => {
    const { columns, warnings } = mapColumns([
      "WBS Code",
      "Description",
      "Unit",
      "Unit Cost",
    ]);
    const unitColumns = columns.filter((c) => c.index === 2 || c.index === 3);
    // "Unit Cost" is high confidence, the bare "Unit" is only a last resort.
    expect(unitColumns.find((c) => c.index === 3)?.field).toBe(
      "unit_cost_budgeted",
    );
    expect(unitColumns.find((c) => c.index === 2)?.field).toBeNull();
    expect(warnings.join(" ")).toContain("Unit Cost");
  });
});

describe("codeDepth / inferParentCode", () => {
  it("derives a parent only from a separated code", () => {
    expect(codeDepth("1.1.2")).toBe(2);
    expect(codeDepth("1")).toBe(0);
    expect(inferParentCode("1.1.2")).toBe("1.1");
    expect(inferParentCode("1.0")).toBe("1");
    expect(inferParentCode("1")).toBeNull();
    expect(inferParentCode("ABC")).toBeNull();
  });
});

describe("resolveHierarchy", () => {
  const row = (
    wbs_code: string,
    parent_wbs_code: string | null = null,
    sourceRow = 1,
  ): MappedRow => ({
    sourceRow,
    wbs_code,
    description: wbs_code,
    parent_wbs_code,
    parent_source: parent_wbs_code ? "explicit" : "none",
    unit_cost_budgeted: 1,
    quantity_budgeted: 1,
    days_budgeted: 1,
    total_cost_budgeted: null,
    uom: null,
    category_label: null,
    estimatedTotal: 1,
    issues: [],
    warnings: [],
  });

  it("orders a parent before a child even when the child's code is shallower", () => {
    // This is the regression that matters. Sorting by separator count would put
    // "1" (depth 0) before its parent "9.9.9.9" (depth 3), the parent's id would
    // not exist yet, and the child would be silently flattened to the top level
    // — reintroducing the exact bug this function exists to remove.
    const { rows } = resolveHierarchy([
      row("1", "9.9.9.9", 1),
      row("9.9.9.9", null, 2),
    ]);
    expect(rows.map((r) => r.wbs_code)).toEqual(["9.9.9.9", "1"]);
  });

  it("keeps parents before children through a whole chain, whatever the order", () => {
    const { rows } = resolveHierarchy([
      row("c", "b", 1),
      row("b", "a", 2),
      row("a", null, 3),
    ]);
    expect(rows.map((r) => r.wbs_code)).toEqual(["a", "b", "c"]);
  });

  it("emits every row, and puts each parent before all of its children", () => {
    const { rows } = resolveHierarchy([
      row("c", "b", 1),
      row("b", "a", 2),
      row("a", null, 3),
      row("b2", "a", 4),
    ]);
    const at = new Map(rows.map((r, i) => [r.wbs_code, i]));
    expect(rows).toHaveLength(4);
    expect(at.get("a")!).toBeLessThan(at.get("b")!);
    expect(at.get("b")!).toBeLessThan(at.get("c")!);
    expect(at.get("a")!).toBeLessThan(at.get("b2")!);
  });

  it("still infers a parent from a dotted code when there is no parent column", () => {
    const { rows } = resolveHierarchy([row("1.1"), row("1")]);
    const child = rows.find((r) => r.wbs_code === "1.1");
    expect(child?.parent_wbs_code).toBe("1");
    expect(child?.parent_source).toBe("inferred");
  });

  it("detects a parent loop, refuses those rows and says so", () => {
    const { rows, warnings } = resolveHierarchy([row("A", "B", 1), row("B", "A", 2)]);
    expect(warnings.join(" ")).toMatch(/circular/i);
    // Neither member of a cycle can be created before its own parent, so both
    // are reported rather than emitted in an order that cannot be satisfied.
    expect(rows.every((r) => r.issues.length > 0)).toBe(true);
    expect(rows.every((r) => r.parent_wbs_code === null)).toBe(true);
  });

  it("detaches a row whose parent is not in the file and reports it", () => {
    const { rows, warnings } = resolveHierarchy([row("1.1", "MISSING")]);
    expect(rows[0].parent_wbs_code).toBeNull();
    expect(warnings.join(" ")).toContain("MISSING");
  });

  it("does not mutate its input, so re-analysing is idempotent", () => {
    const input = [row("1", "2", 1), row("2", null, 2)];
    const first = resolveHierarchy(input);
    const second = resolveHierarchy(input);
    expect(first.rows.map((r) => r.wbs_code)).toEqual(
      second.rows.map((r) => r.wbs_code),
    );
    expect(input[0].parent_source).toBe("explicit");
  });
});

describe("analyseDelimitedText", () => {
  it("reads a canonical sheet end to end", () => {
    const analysis = analyseDelimitedText(
      [
        CANONICAL_HEADER.join(","),
        "1.0,Phase one,100,10,2,2000",
        "1.1,Sub activity,50,4,1,200",
      ].join("\n"),
    );
    expect(analysis.headerRow).toBe(1);
    expect(analysis.summary.importable).toBe(2);
    expect(analysis.summary.estimatedTotal).toBe(2200);
    expect(importableRows(analysis).map((r) => r.wbs_code)).toEqual([
      "1.0",
      "1.1",
    ]);
  });

  it("flags a stated total that contradicts unit x quantity x days", () => {
    // 100 x 10 x 2 = 2000, but the sheet says 5000. Which number is the
    // control figure? The operator has to answer that, not the importer.
    const analysis = analyseDelimitedText(
      [
        CANONICAL_HEADER.join(","),
        "1.0,Phase one,100,10,2,5000",
      ].join("\n"),
    );
    expect(analysis.summary.importable).toBe(0);
    expect(analysis.summary.flagged).toBe(1);
    expect(analysis.rows[0].issues.join(" ")).toMatch(/does not match/);
  });

  it("accepts a stated total that agrees with the arithmetic", () => {
    const analysis = analyseDelimitedText(
      [CANONICAL_HEADER.join(","), "1.0,Phase one,100,10,2,2000"].join("\n"),
    );
    expect(analysis.summary.importable).toBe(1);
  });

  it("rejects a WBS code longer than the column allows", () => {
    // wbs_code is varchar(50); an over-long value aborts the INSERT rather than
    // failing validation, which would lose the whole import.
    const analysis = analyseDelimitedText(
      [CANONICAL_HEADER.join(","), `${"X".repeat(MAX_WBS_CODE_LENGTH + 1)},Too long,1,1,1`].join(
        "\n",
      ),
    );
    expect(analysis.summary.importable).toBe(0);
    expect(analysis.rows[0].issues.join(" ")).toMatch(/maximum is 50/);
  });

  it("rejects a duplicate code instead of letting the unique constraint fail", () => {
    const analysis = analyseDelimitedText(
      [CANONICAL_HEADER.join(","), "1.0,First,1,1,1", "1.0,Second,1,1,1"].join("\n"),
    );
    expect(analysis.summary.importable).toBe(1);
    expect(analysis.rows[1].issues.join(" ")).toMatch(/duplicate WBS code/);
  });

  it("skips a totals row rather than creating a phantom node", () => {
    const analysis = analyseDelimitedText(
      [
        CANONICAL_HEADER.join(","),
        "1.0,Phase one,100,1,1",
        ",Grand Total,,,",
      ].join("\n"),
    );
    expect(analysis.summary.skipped).toBe(1);
    expect(analysis.summary.importable).toBe(1);
  });

  it("explains itself when no header can be found at all", () => {
    const analysis = analyseDelimitedText("alpha\nbeta\ngamma");
    expect(analysis.headerRow).toBeNull();
    expect(analysis.warnings.join(" ")).toMatch(/header row/i);
  });

  it("reports a truncated file instead of pretending it imported everything", () => {
    const budget = MAX_DATA_ROWS + 25;
    const lines = [CANONICAL_HEADER.join(",")];
    for (let i = 0; i < budget + 12; i++) lines.push(`${i}.0,Row ${i},1,1,1`);
    const analysis = analyseDelimitedText(lines.join("\n"));
    expect(analysis.truncated).toBe(true);
    // The header line counts against the cap, so one more row is dropped than
    // the 12 that were appended.
    expect(analysis.droppedRows).toBe(13);
    expect(analysis.warnings.join(" ")).toMatch(/will NOT be imported/);
  });

  it("surfaces mixed currencies rather than silently mixing them", () => {
    const analysis = analyseDelimitedText(
      [
        "WBS Code,Description,Unit Cost,Total Cost",
        "1.0,Local works,NGN 1,000.00,1000",
        "1.1,Imported steel,USD 500.00,500",
      ].join("\n"),
    );
    expect(analysis.currencies).toEqual(expect.arrayContaining(["NGN", "USD"]));
    expect(analysis.warnings.join(" ")).toMatch(/not converted|NOT be converted/i);
  });
});

describe("analyseMatrix", () => {
  it("never throws on a file it cannot understand", () => {
    const analysis = analyseMatrix(matrix(["nothing", "useful"]), {
      source: "csv",
    });
    expect(analysis.summary.importable).toBe(0);
    expect(analysis.warnings.length).toBeGreaterThan(0);
  });
});

describe("buildRows", () => {
  it("warns when rows are wider than the header", () => {
    // A missed delimiter inside an unquoted field silently discards the tail.
    const { warnings } = buildRows(
      matrix(
        CANONICAL_HEADER,
        // Seven cells against a six-column header: the extra one is dropped.
        ["1.0", "Phase, one, with commas", "1", "1", "1", "1", "1"],
      ),
      0,
      mapColumns(CANONICAL_HEADER).columns,
      "the file",
      CANONICAL_HEADER.length,
    );
    expect(warnings.join(" ")).toMatch(/more fields than the header/);
  });
});

describe("toCreateWbsBudgetPayload", () => {
  it("carries only persistence fields, never diagnostics", () => {
    const payload = toCreateWbsBudgetPayload(
      {
        sourceRow: 7,
        wbs_code: "1.0",
        description: "Phase one",
        parent_wbs_code: null,
        parent_source: "none",
        unit_cost_budgeted: 100,
        quantity_budgeted: 10,
        days_budgeted: 2,
        total_cost_budgeted: null,
        uom: "m3",
        category_label: "Civil Works",
        estimatedTotal: 2000,
        issues: [],
        warnings: ["a warning"],
        original: { unit_cost_budgeted: "NGN 100" },
      },
      "project-uuid",
    );
    expect(payload).toEqual({
      project_id: "project-uuid",
      wbs_code: "1.0",
      description: "Phase one",
      unit_cost_budgeted: 100,
      quantity_budgeted: 10,
      days_budgeted: 2,
      // Derived from unit x qty x days when the sheet states no total.
      total_cost_budgeted: 2000,
      uom: "m3",
      category_label: "Civil Works",
      parent_wbs_code: null,
    });
    expect(payload).not.toHaveProperty("issues");
    expect(payload).not.toHaveProperty("estimatedTotal");
  });

  it("keeps an explicitly stated total over the derived one", () => {
    const payload = toCreateWbsBudgetPayload(
      {
        sourceRow: 1,
        wbs_code: "1.0",
        description: "x",
        parent_wbs_code: null,
        parent_source: "none",
        unit_cost_budgeted: 100,
        quantity_budgeted: 1,
        days_budgeted: 1,
        total_cost_budgeted: 250,
        uom: null,
        category_label: null,
        estimatedTotal: 250,
        issues: [],
        warnings: [],
      },
      "p",
    );
    expect(payload.total_cost_budgeted).toBe(250);
  });
});

describe("assertWorkbookWithinLimits", () => {
  /**
   * Builds a zip whose central directory declares the given sizes.
   *
   * The sizes live at central-header + 20 and + 24, so they have to be written
   * relative to that signature — writing them relative to the local header
   * produces a file the guard correctly ignores, which is how this fixture
   * caught itself.
   */
  const fakeZip = (uncompressed: number, compressed: number): Buffer => {
    const buf = Buffer.alloc(64);
    buf.write("PK\x03\x04", 0, "binary");
    const centralAt = 32;
    buf.write("PK\x01\x02", centralAt, "binary");
    buf.writeUInt32LE(compressed, centralAt + 20);
    buf.writeUInt32LE(uncompressed, centralAt + 24);
    return buf;
  };

  const limits = {
    maxRows: 5025,
    maxColumns: 60,
    maxUncompressedBytes: 64 * 1024 * 1024,
  };

  it("rejects a bomb BEFORE the workbook is ever inflated", () => {
    // A 64-byte payload that claims to expand to 1 GB.
    const bomb = fakeZip(1024 * 1024 * 1024, 12);
    expect(() => assertWorkbookWithinLimits(bomb, limits)).toThrow(
      SpreadsheetTooLargeError,
    );
    try {
      assertWorkbookWithinLimits(bomb, limits);
    } catch (err) {
      expect((err as SpreadsheetTooLargeError).code).toBe("ZIP_BOMB");
    }
  });

  it("rejects a zero-compressed entry with a huge declared size", () => {
    expect(() => assertWorkbookWithinLimits(fakeZip(1 << 30, 0), limits)).toThrow(
      SpreadsheetTooLargeError,
    );
  });

  it("sums across entries rather than trusting any single one", () => {
    const many = Buffer.concat([
      fakeZip(40 * 1024 * 1024, 1024),
      fakeZip(40 * 1024 * 1024, 1024),
    ]);
    expect(() => assertWorkbookWithinLimits(many, limits)).toThrow(
      /more than/,
    );
  });

  it("accepts an ordinary workbook", () => {
    expect(() =>
      assertWorkbookWithinLimits(fakeZip(2 * 1024 * 1024, 400 * 1024), limits),
    ).not.toThrow();
  });

  it("finds a central directory anywhere in the file, not just the front", () => {
    // A real workbook puts its central directory at the END. A guard that only
    // scans the first few bytes reports a healthy file and then loads it.
    const centralAt = 200;
    const buf = Buffer.alloc(centralAt + 64);
    buf.write("PK\x01\x02", centralAt, "binary");
    buf.writeUInt32LE(1024, centralAt + 20);
    buf.writeUInt32LE(1024 * 1024 * 1024, centralAt + 24);
    expect(() => assertWorkbookWithinLimits(buf, limits)).toThrow(
      SpreadsheetTooLargeError,
    );
  });

  it("ignores a truncated central header rather than reading past the end", () => {
    const buf = Buffer.alloc(34);
    buf.write("PK\x01\x02", 30, "binary");
    expect(() => assertWorkbookWithinLimits(buf, limits)).not.toThrow();
  });

  it("rejects an empty or too-short payload as corrupt", () => {
    expect(() => assertWorkbookWithinLimits(Buffer.alloc(0), limits)).toThrow(
      /not a valid workbook/,
    );
    expect(() => assertWorkbookWithinLimits(Buffer.from("ab"), limits)).toThrow(
      /not a valid workbook/,
    );
  });
});

describe("parseWbsImportMode", () => {
  it("accepts the three real modes and normalises case and spacing", () => {
    expect(parseWbsImportMode("create")).toBe("create");
    expect(parseWbsImportMode("UPDATE")).toBe("update");
    expect(parseWbsImportMode("  skip ")).toBe("skip");
  });

  it("defaults to create only when the client said nothing at all", () => {
    expect(parseWbsImportMode(undefined)).toBe("create");
    expect(parseWbsImportMode("")).toBe("create");
    expect(parseWbsImportMode(null)).toBe("create");
  });

  it("rejects anything unknown rather than guessing", () => {
    // A typo must not become `update`, which overwrites live budget figures.
    for (const bad of ["updte", "upsert", "delete", "CREATE ALL", "1", true]) {
      expect(parseWbsImportMode(bad)).toBeNull();
    }
  });
});

describe("codeKey", () => {
  it("matches codes regardless of case and surrounding space", () => {
    expect(codeKey(" 1.0 ")).toBe("1.0");
    expect(codeKey("abc")).toBe(codeKey(" ABC "));
  });
});
