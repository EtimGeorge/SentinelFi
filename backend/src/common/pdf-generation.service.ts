import {
  Injectable,
  Logger,
  InternalServerErrorException,
  Inject,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import * as crypto from "crypto";
import * as puppeteer from "puppeteer";

import * as fs from "fs";
import * as path from "path";
import * as hbs from "handlebars";

@Injectable()
export class PdfGenerationService {
  private readonly logger = new Logger(PdfGenerationService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Higher-level helper to generate PDF from a Handlebars template file.
   * Expects templates to be in src/common/templates/
   */
  async generatePdf(templateName: string, data: any): Promise<Buffer> {
    try {
      // In NestJS build, templates might be in different relative locations.
      // We aim for the 'common/templates' directory.
      const templatePath = path.join(
        __dirname,
        "templates",
        `${templateName}.hbs`,
      );

      if (!fs.existsSync(templatePath)) {
        this.logger.error(`PDF Template not found: ${templatePath}`);
        throw new InternalServerErrorException(
          `Template ${templateName} not found.`,
        );
      }

      const source = fs.readFileSync(templatePath, "utf8");
      const template = hbs.compile(source);
      const html = template(data);

      return this.generatePdfFromHtml(html);
    } catch (error) {
      this.logger.error(
        `Template generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Generates a PDF buffer from a raw HTML string using Puppeteer.
   *
   * @param html The fully compiled HTML string (e.g., from Handlebars).
   * @param options Puppeteer PDFOptions (like format: 'A4', margin, landscape, etc).
   * @returns A Buffer containing the PDF data.
   */
  async generatePdfFromHtml(
    html: string,
    options: puppeteer.PDFOptions = {
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    },
  ): Promise<Buffer> {
    // 1. Check Cache First (Content-Addressed Hashing)
    const hash = crypto.createHash("md5").update(html).digest("hex");
    const cacheKey = `pdf_cache:${hash}`;

    const cachedBuffer = await this.cacheManager.get<Buffer>(cacheKey);
    if (cachedBuffer) {
      this.logger.log(`Serving PDF from cache: ${cacheKey}`);
      return Buffer.from(cachedBuffer);
    }

    this.logger.log("Starting Puppeteer to generate PDF from HTML...");

    let browser: puppeteer.Browser | null = null;
    try {
      // Launch Puppeteer. In a Docker environment, these args are crucial.
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      const page = await browser.newPage();

      // Wait until there are no more than 0 network connections for at least 500 ms.
      // Useful if HTML contains external images or fonts (like the Base64 Brand logo).
      await page.setContent(html, { waitUntil: "networkidle0" });

      // Generate PDF
      const pdfBuffer = await page.pdf(options);
      const outputBuffer = Buffer.from(pdfBuffer);

      // 3. Store in Cache (TTL: 1 hour)
      await this.cacheManager.set(cacheKey, outputBuffer, 3600);

      this.logger.log("Successfully generated and cached PDF.");
      return outputBuffer;
    } catch (error) {
      this.logger.error(
        `Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException("Error generating PDF document.");
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
