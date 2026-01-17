import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { BillingOverviewDto } from "./dto/billing-overview.dto";
import { InvoiceDto, InvoiceStatus } from "./dto/invoice.dto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  async getBillingOverview(): Promise<BillingOverviewDto> {
    this.logger.log("Simulating billing overview data retrieval.");
    // In a real application, this would fetch data from a billing provider like Stripe.
    return {
      totalMrr: 45000.5,
      activeSubscriptions: 450,
      pendingInvoices: 15,
      mrrGrowthPercentage: 5.2,
      subscriptionGrowthPercentage: 3.8,
    };
  }

  async getRecentInvoices(): Promise<InvoiceDto[]> {
    this.logger.log("Simulating recent invoices data retrieval.");
    const invoices: InvoiceDto[] = [];
    const statuses = [
      InvoiceStatus.Paid,
      InvoiceStatus.Pending,
      InvoiceStatus.Overdue,
    ];
    for (let i = 0; i < 10; i++) {
      invoices.push({
        id: `inv_${new Date().getTime()}${i}`,
        tenantName: `Tenant Corp ${i + 1}`,
        amount: Math.random() * 1000 + 100,
        date: new Date(new Date().setDate(new Date().getDate() - i * 5)),
        status: statuses[Math.floor(Math.random() * statuses.length)],
      });
    }
    return invoices;
  }

  async downloadInvoice(invoiceId: string): Promise<Buffer> {
    this.logger.log(`Simulating invoice download for ID: ${invoiceId}`);

    // In a real app, you'd fetch invoice data from the DB
    const recentInvoices = await this.getRecentInvoices();
    const invoice = recentInvoices.find((inv) => inv.id === invoiceId);

    if (!invoice) {
      // Find *any* invoice if the ID doesn't match, to prevent errors in simulation
      const anyInvoice = recentInvoices[0];
      if (!anyInvoice) {
        throw new NotFoundException(
          "No invoices available to generate a report.",
        );
      }
      this.logger.warn(
        `Invoice with ID ${invoiceId} not found, using first available invoice for PDF generation.`,
      );
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;

    page.drawText("Invoice", {
      x: 50,
      y: height - 4 * fontSize,
      font,
      size: 24,
      color: rgb(0, 0.53, 0.71),
    });

    page.drawText(`Invoice ID: ${invoiceId}`, {
      x: 50,
      y: height - 6 * fontSize,
      font,
      size: fontSize,
    });

    page.drawText(`Tenant: ${invoice?.tenantName || "N/A"}`, {
      x: 50,
      y: height - 8 * fontSize,
      font,
      size: fontSize,
    });

    page.drawText(`Amount: $${invoice?.amount.toFixed(2) || "0.00"}`, {
      x: 50,
      y: height - 9 * fontSize,
      font,
      size: fontSize,
    });

    page.drawText(`Date: ${invoice?.date.toDateString() || "N/A"}`, {
      x: 50,
      y: height - 10 * fontSize,
      font,
      size: fontSize,
    });

    page.drawText(`Status: ${invoice?.status || "N/A"}`, {
      x: 50,
      y: height - 11 * fontSize,
      font,
      size: fontSize,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
