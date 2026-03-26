import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfGenerationService {
  private readonly logger = new Logger(PdfGenerationService.name);

  /**
   * Generates a PDF buffer from a raw HTML string using Puppeteer.
   * 
   * @param html The fully compiled HTML string (e.g., from Handlebars).
   * @param options Puppeteer PDFOptions (like format: 'A4', margin, landscape, etc).
   * @returns A Buffer containing the PDF data.
   */
  async generatePdfFromHtml(
    html: string,
    options: puppeteer.PDFOptions = { format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } },
  ): Promise<Buffer> {
    this.logger.log('Starting Puppeteer to generate PDF from HTML...');
    let browser: puppeteer.Browser | null = null;
    try {
      // Launch Puppeteer. In a Docker environment, these args are crucial.
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ],
      });

      const page = await browser.newPage();
      
      // Wait until there are no more than 0 network connections for at least 500 ms.
      // Useful if HTML contains external images or fonts (like the Base64 Brand logo).
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf(options);

      this.logger.log('Successfully generated PDF.');
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException('Error generating PDF document.');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
