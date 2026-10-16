import { PDFDocument, PDFImage, PDFPage, rgb, RGB } from "pdf-lib";

/**
 * FE-2: single source of truth for tenant report branding.
 *
 * Tenant branding (logo / primary color / address) is collected in
 * settings (`PATCH /admin/tenants/my/branding`) and travels inside the
 * report `context`. Every renderer (pdf-lib, exceljs, docx, and the
 * frontend white-paper preview) resolves it through here, so an unset
 * brand degrades to the long-standing neutral defaults instead of
 * silently rendering someone else's identity.
 */

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;
const DEFAULT_PRIMARY_HEX = "4A5568"; // slate — the historic hardcoded default

export interface ReportBrandInput {
  tenantName?: string | null;
  projectName?: string | null;
  companyAddress?: string | null;
  brandPrimaryColorHex?: string | null;
  brandLogoBase64?: string | null;
  [key: string]: unknown;
}

export interface ResolvedReportBrand {
  name: string;
  address: string | null;
  primaryHex: string; // 6-digit, no '#'
  primaryPdf: RGB;
  /** exceljs ARGB, e.g. "FF4A5568" */
  primaryArgb: string;
  logoBase64: string | null;
}

export function normalizeHex(input?: string | null): string {
  const raw = (input || "").trim().replace(/^#/, "");
  return HEX_RE.test(raw) ? raw.toUpperCase() : DEFAULT_PRIMARY_HEX;
}

export function hexToPdfRgb(hex6: string): RGB {
  const h = normalizeHex(hex6);
  return rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  );
}

export function resolveReportBrand(context?: ReportBrandInput | null): ResolvedReportBrand {
  const primaryHex = normalizeHex(
    (context?.brandPrimaryColorHex as string) ?? null,
  );
  return {
    name:
      (context?.tenantName as string) || "SentinelFi",
    address: (context?.companyAddress as string) || null,
    primaryHex,
    primaryPdf: hexToPdfRgb(primaryHex),
    primaryArgb: `FF${primaryHex}`,
    logoBase64: (context?.brandLogoBase64 as string) || null,
  };
}

/**
 * Embeds a tenant logo (PNG or JPEG data-URI / raw base64) once per document.
 * Returns null for missing, SVG, or corrupt payloads — branding must never
 * break report generation.
 */
export async function embedBrandLogo(
  pdfDoc: PDFDocument,
  logoBase64?: string | null,
): Promise<{ image: PDFImage; width: number; height: number } | null> {
  if (!logoBase64) return null;
  try {
    const cleaned = logoBase64.includes(",")
      ? logoBase64.slice(logoBase64.indexOf(",") + 1)
      : logoBase64;
    const bytes = Buffer.from(cleaned, "base64");
    if (bytes.length < 8) return null;
    // PNG magic: 89 50 4E 47 · JPEG magic: FF D8 FF
    const isPng =
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!isPng && !isJpg) return null;
    const image = isPng
      ? await pdfDoc.embedPng(bytes)
      : await pdfDoc.embedJpg(bytes);
    const { width, height } = image.scale(1);
    return { image, width, height };
  } catch {
    return null;
  }
}

export interface BrandedHeaderArgs {
  page: PDFPage;
  pdfDoc: PDFDocument;
  font: any;
  boldFont: any;
  title: string;
  brand: ResolvedReportBrand;
  logo: { image: PDFImage; width: number; height: number } | null;
  width: number;
  height: number;
  pageLabel?: string;
  datePrefix?: string;
}

/**
 * Shared pdf-lib page header. Preserves the historic layout (tenant line,
 * title, date, page number) and adds: tenant logo at top-left when
 * embeddable, company address under the date, and a primary-color rule
 * beneath the title.
 */
export function drawBrandedHeader(args: BrandedHeaderArgs): void {
  const {
    page,
    pdfDoc,
    font,
    boldFont,
    title,
    brand,
    logo,
    width,
    height,
    pageLabel,
    datePrefix = "Date",
  } = args;
  const GRAY = rgb(0.5, 0.5, 0.5);
  const BLACK = rgb(0, 0, 0);

  let tenantX = 50;
  if (logo) {
    const targetH = 22;
    const scale = Math.min(1, targetH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    page.drawImage(logo.image, { x: 50, y: height - 20 - h, width: w, height: h });
    tenantX = 50 + w + 10;
  }
  page.drawText(brand.name, {
    x: tenantX,
    y: height - 20,
    font: boldFont,
    size: 10,
    color: GRAY,
  });
  page.drawText(title, {
    x: 50,
    y: height - 35,
    font: boldFont,
    size: 14,
    color: BLACK,
  });
  // Primary-color rule beneath the title.
  page.drawLine({
    start: { x: 50, y: height - 42 },
    end: { x: 130, y: height - 42 },
    color: brand.primaryPdf,
    thickness: 3,
  });
  page.drawText(`${datePrefix}: ${new Date().toLocaleDateString()}`, {
    x: width - 150,
    y: height - 30,
    font,
    size: 10,
    color: BLACK,
  });
  if (brand.address) {
    const addr =
      brand.address.length > 42
        ? `${brand.address.slice(0, 41)}…`
        : brand.address;
    page.drawText(addr, {
      x: width - 150,
      y: height - 42,
      font,
      size: 8,
      color: GRAY,
    });
  }
  const pageNo = pdfDoc.getPages().indexOf(page) + 1;
  page.drawText(pageLabel ?? `Page ${pageNo}`, {
    x: width / 2 - 30,
    y: 20,
    font,
    size: 8,
    color: BLACK,
  });
}
