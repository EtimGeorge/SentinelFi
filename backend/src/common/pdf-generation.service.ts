import {
  Injectable,
  Logger,
  InternalServerErrorException,
  Inject,
  OnModuleDestroy,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import * as crypto from "crypto";
import * as puppeteer from "puppeteer";

import * as fs from "fs";
import * as path from "path";
import * as hbs from "handlebars";

@Injectable()
export class PdfGenerationService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfGenerationService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * When set, all rendering is delegated to the standalone Chromium worker
   * (`backend/src/worker.ts`). The API process then never hosts a browser,
   * which is what keeps it runnable on a small/free instance.
   */
  private readonly workerUrl = (process.env.PDF_WORKER_URL || "")
    .trim()
    .replace(/\/+$/, "");
  private readonly workerToken = (process.env.PDF_WORKER_TOKEN || "").trim();
  private readonly workerTimeoutMs = Math.max(
    10_000,
    Number(process.env.PDF_WORKER_TIMEOUT_MS || 120_000),
  );
  private readonly navTimeoutMs = Math.max(
    5_000,
    Number(process.env.PDF_NAV_TIMEOUT_MS || 60_000),
  );

  /**
   * Locally-launched browser, reused across renders. Launching per request was
   * the root cause of the first-request "Navigation timeout of 30000 ms" —
   * the launch itself ate the navigation budget. One warm browser fixes it.
   */
  private browserPromise: Promise<puppeteer.Browser> | null = null;

  private readonly defaultOptions: puppeteer.PDFOptions = {
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
  };

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
   * Generates a PDF buffer from a raw HTML string.
   *
   * Delegates to the remote Chromium worker when `PDF_WORKER_URL` is configured,
   * otherwise renders in-process (development / single-box deployments).
   */
  async generatePdfFromHtml(
    html: string,
    options: puppeteer.PDFOptions = this.defaultOptions,
  ): Promise<Buffer> {
    // 1. Check Cache First (Content-Addressed Hashing)
    const hash = crypto.createHash("md5").update(html).digest("hex");
    const cacheKey = `pdf_cache:${hash}`;

    const cachedBuffer = await this.cacheManager.get<Buffer>(cacheKey);
    if (cachedBuffer) {
      this.logger.log(`Serving PDF from cache: ${cacheKey}`);
      return Buffer.from(cachedBuffer);
    }

    try {
      const merged = { ...this.defaultOptions, ...options };
      const outputBuffer = this.workerUrl
        ? await this.renderViaWorker(html, merged)
        : await this.renderLocally(html, merged);

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
    }
  }

  private async renderViaWorker(
    html: string,
    options: puppeteer.PDFOptions,
  ): Promise<Buffer> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.workerTimeoutMs);
    try {
      const response = await fetch(`${this.workerUrl}/render`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-worker-token": this.workerToken,
        },
        body: JSON.stringify({ html, options }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `PDF worker responded ${response.status}: ${detail.slice(0, 200)}`,
        );
      }

      return Buffer.from(await response.arrayBuffer());
    } finally {
      clearTimeout(timer);
    }
  }

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer
        .launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
          ],
        })
        .catch((err) => {
          this.browserPromise = null;
          throw err;
        });
    }
    const browser = await this.browserPromise;
    if (!browser.connected) {
      this.browserPromise = null;
      return this.getBrowser();
    }
    return browser;
  }

  private async renderLocally(
    html: string,
    options: puppeteer.PDFOptions,
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    let page: puppeteer.Page | null = null;
    try {
      page = await browser.newPage();
      page.setDefaultNavigationTimeout(this.navTimeoutMs);
      page.setDefaultTimeout(this.navTimeoutMs);
      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: this.navTimeoutMs,
      });
      const pdf = await page.pdf(options);
      return Buffer.from(pdf);
    } finally {
      if (page) await page.close().catch(() => undefined);
    }
  }

  async onModuleDestroy(): Promise<void> {
    const pending = this.browserPromise;
    this.browserPromise = null;
    if (pending) {
      await pending
        .then((browser) => browser.close())
        .catch(() => undefined);
    }
  }
}
