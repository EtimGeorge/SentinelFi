import { PDFDocument } from "pdf-lib";
import {
  normalizeHex,
  hexToPdfRgb,
  resolveReportBrand,
  embedBrandLogo,
} from "./report-brand";

describe("report-brand (FE-2)", () => {
  it("falls back to neutral defaults when no brand is set", () => {
    const brand = resolveReportBrand({});
    expect(brand.name).toBe("SentinelFi");
    expect(brand.address).toBeNull();
    expect(brand.primaryHex).toBe("4A5568");
    expect(brand.primaryArgb).toBe("FF4A5568");
    expect(brand.logoBase64).toBeNull();
  });

  it("accepts tenant branding and normalizes the hex color", () => {
    const brand = resolveReportBrand({
      tenantName: "Acme",
      companyAddress: "12 Marina, Lagos",
      brandPrimaryColorHex: "#0d9488",
      brandLogoBase64: "data:image/png;base64,AAA",
    });
    expect(brand.name).toBe("Acme");
    expect(brand.address).toBe("12 Marina, Lagos");
    expect(brand.primaryHex).toBe("0D9488");
    expect(brand.primaryArgb).toBe("FF0D9488");
  });

  it("rejects malformed colors instead of rendering garbage", () => {
    expect(normalizeHex("red")).toBe("4A5568");
    expect(normalizeHex("#12345")).toBe("4A5568");
    expect(normalizeHex(null)).toBe("4A5568");
    expect(normalizeHex("0d9488")).toBe("0D9488");
  });

  it("converts brand hex to pdf-lib rgb channels", () => {
    const c = hexToPdfRgb("FF0000");
    expect(c.red).toBeCloseTo(1);
    expect(c.green).toBeCloseTo(0);
    expect(c.blue).toBeCloseTo(0);
  });

  it("refuses to embed missing, SVG, or corrupt logos", async () => {
    const pdfDoc = await PDFDocument.create();
    await expect(embedBrandLogo(pdfDoc, null)).resolves.toBeNull();
    await expect(embedBrandLogo(pdfDoc, undefined)).resolves.toBeNull();
    await expect(
      embedBrandLogo(pdfDoc, "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="),
    ).resolves.toBeNull();
    await expect(embedBrandLogo(pdfDoc, "not-base64!!!")).resolves.toBeNull();
  });

  it("embeds a real PNG logo", async () => {
    const pdfDoc = await PDFDocument.create();
    // 1x1 transparent PNG
    const tiny =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const logo = await embedBrandLogo(pdfDoc, tiny);
    expect(logo).not.toBeNull();
    expect(logo!.width).toBe(1);
    expect(logo!.height).toBe(1);
  });
});
