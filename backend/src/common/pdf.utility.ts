import { PDFDocument, rgb, StandardFonts, PageSizes, PDFPage } from "pdf-lib";
import { ProjectEntity } from "../projects/project.entity";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { OperationalBudgetEntity } from "../operational-budgets/operational-budget.entity";
import { formatCurrency } from "../../../frontend/lib/utils"; // Reusing frontend utility for consistency

export class PdfUtility {
  static formatCurrencyWithContext(amount: number, context?: any): string {
    if (context && context.currencyRate && context.currencySymbol) {
      const converted = amount * context.currencyRate;
      return `${context.currencySymbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    // Fallback if context is missing or incomplete
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  static async generateProjectReport(
    projects: (ProjectEntity & {
      total_budgeted_rollup: number;
      total_paid_rollup: number;
    })[],
    title: string = "Project Portfolio Report", context?: any,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    let y = height - 50;

    const drawHeader = (currentPage: PDFPage, totalPages: number) => {
      currentPage.drawText(context?.tenantName || "SentinelFi", { x: 50, y: height - 20, font: boldFont, size: 10, color: rgb(0.5, 0.5, 0.5) });
      currentPage.drawText(context?.projectName ? `${title} - ${context.projectName}` : title, { x: 50, y: height - 35, font: boldFont, size: 14,
        color: rgb(0, 0, 0),
      });
      currentPage.drawText(`Date: ${new Date().toLocaleDateString()}`, {
        x: width - 150,
        y: height - 30,
        font,
        size: 10,
        color: rgb(0, 0, 0),
      });
      currentPage.drawText(
        `Page ${pdfDoc.getPages().indexOf(currentPage) + 1} of ${totalPages}`,
        {
          x: width / 2 - 30,
          y: 20,
          font,
          size: 8,
          color: rgb(0, 0, 0),
        },
      );
    };

    // Initial header draw is flawed, will be addressed in final pass
    drawHeader(page, 1);

    y -= 40; // Space after title

    const startX = 50;
    const colWidths = [150, 80, 80, 80, 80]; // Name, Budget, Spent, Variance, Status
    const tableHeaders = [
      "Project Name",
      "Budget",
      "Spent",
      "Variance (%)",
      "Status",
    ];
    const rowHeight = 20;

    const drawTableRow = (data: string[], isHeader = false) => {
      let currentX = startX;
      data.forEach((text, index) => {
        page.drawText(text, {
          x: currentX + 5,
          y: y,
          font: isHeader ? boldFont : font,
          size: 10,
          color: rgb(0, 0, 0),
        });
        currentX += colWidths[index];
      });
      y -= rowHeight;
      // Draw lines for the row
      page.drawLine({
        start: { x: startX, y: y + rowHeight },
        end: {
          x: startX + colWidths.reduce((a, b) => a + b, 0),
          y: y + rowHeight,
        },
        color: rgb(0.7, 0.7, 0.7),
        thickness: 0.5,
      });
    };

    // Draw table headers
    drawTableRow(tableHeaders, true);
    y -= 5; // Extra space after header

    for (const project of projects) {
      if (y < 70) {
        // Check if new page is needed
        page = pdfDoc.addPage(PageSizes.A4);
        y = height - 50;
        drawHeader(page, 1); // Placeholder total pages
        y -= 40;
        drawTableRow(tableHeaders, true); // Redraw headers on new page
        y -= 5;
      }

      const variance =
        project.total_budgeted_rollup > 0
          ? ((project.total_paid_rollup - project.total_budgeted_rollup) /
              project.total_budgeted_rollup) *
            100
          : 0;
      const rowData = [
        project.project_name,
        PdfUtility.formatCurrencyWithContext(project.total_budgeted_rollup, context),
        PdfUtility.formatCurrencyWithContext(project.total_paid_rollup, context),
        `${variance.toFixed(2)}%`,
        project.status,
      ];
      drawTableRow(rowData);
    }

    // Final pass to update all page numbers correctly
    const totalPages = pdfDoc.getPages().length;
    for (let i = 0; i < totalPages; i++) {
      drawHeader(pdfDoc.getPages()[i], totalPages);
    }

    const finalPdfBytes = await pdfDoc.save();
    return finalPdfBytes;
  }

  // --- Other report types (WBS Budget, Live Expense, Operational Budget) will follow a similar pattern ---
  static async generateWbsBudgetReport(
    budgets: WbsBudgetEntity[],
    title: string = "WBS Budget Report", context?: any,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    let y = height - 50;

    const drawHeader = (currentPage: PDFPage, totalPages: number) => {
      currentPage.drawText(context?.tenantName || "SentinelFi", { x: 50, y: height - 20, font: boldFont, size: 10, color: rgb(0.5, 0.5, 0.5) });
      currentPage.drawText(context?.projectName ? `${title} - ${context.projectName}` : title, { x: 50, y: height - 35, font: boldFont, size: 14,
        color: rgb(0, 0, 0),
      });
      currentPage.drawText(`Date: ${new Date().toLocaleDateString()}`, {
        x: width - 150,
        y: height - 30,
        font,
        size: 10,
        color: rgb(0, 0, 0),
      });
      currentPage.drawText(
        `Page ${pdfDoc.getPages().indexOf(currentPage) + 1} of ${totalPages}`,
        { x: width / 2 - 30, y: 20, font, size: 8, color: rgb(0, 0, 0) },
      );
    };

    drawHeader(page, 1);
    y -= 40;

    const startX = 50;
    const colWidths = [120, 150, 80, 80, 80]; // Project Name, WBS Code, Description, Budgeted Amount, Status
    const tableHeaders = [
      "Project Name",
      "WBS Code",
      "Description",
      "Budgeted Amount",
      "Status",
    ];
    const rowHeight = 20;

    const drawTableRow = (data: string[], isHeader = false) => {
      let currentX = startX;
      data.forEach((text, index) => {
        page.drawText(text, {
          x: currentX + 5,
          y: y,
          font: isHeader ? boldFont : font,
          size: 10,
          color: rgb(0, 0, 0),
        });
        currentX += colWidths[index];
      });
      y -= rowHeight;
      page.drawLine({
        start: { x: startX, y: y + rowHeight },
        end: {
          x: startX + colWidths.reduce((a, b) => a + b, 0),
          y: y + rowHeight,
        },
        color: rgb(0.7, 0.7, 0.7),
        thickness: 0.5,
      });
    };

    drawTableRow(tableHeaders, true);
    y -= 5;

    let currentProjectName = '';

    for (const budget of budgets) {
      const projName = context?.projectMap?.[(budget as any).project_id] || budget.project?.project_name || "Global Portfolio";
      
      if (projName !== currentProjectName && context?.projectMap) {
        currentProjectName = projName;
        if (y < 100) {
          page = pdfDoc.addPage(PageSizes.A4);
          y = height - 50;
          drawHeader(page, 1);
          y -= 40;
          drawTableRow(tableHeaders, true);
          y -= 5;
        }
        
        page.drawRectangle({
          x: startX,
          y: y - 7,
          width: colWidths.reduce((a, b) => a + b, 0),
          height: 22,
          color: rgb(0.9, 0.95, 1),
        });
        page.drawText(`Project: ${projName}`, {
          x: startX + 5,
          y: y - 1,
          font: boldFont,
          size: 11,
          color: rgb(0.1, 0.3, 0.6),
        });
        y -= 25;
      }

      if (y < 70) {
        page = pdfDoc.addPage(PageSizes.A4);
        y = height - 50;
        drawHeader(page, 1);
        y -= 40;
        drawTableRow(tableHeaders, true);
        y -= 5;
      }

      const rowData = [
        projName,
        budget.wbs_code,
        budget.description,
        PdfUtility.formatCurrencyWithContext(budget.total_cost_budgeted || (budget as any).total_cost_budgeted_rollup, context),
        budget.status,
      ];
      drawTableRow(rowData);
    }

    const totalPages = pdfDoc.getPages().length;
    for (let i = 0; i < totalPages; i++) {
      drawHeader(pdfDoc.getPages()[i], totalPages);
    }

    return pdfDoc.save();
  }

  static async generateLiveExpenseReport(
    expenses: LiveExpenseEntity[],
    title: string = "Live Expense Report", context?: any,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    let y = height - 50;

    const drawHeader = (currentPage: PDFPage, totalPages: number) => {
      currentPage.drawText(context?.tenantName || "SentinelFi", { x: 50, y: height - 20, font: boldFont, size: 10, color: rgb(0.5, 0.5, 0.5) });
      currentPage.drawText(context?.projectName ? `${title} - ${context.projectName}` : title, { x: 50, y: height - 35, font: boldFont, size: 14,
        color: rgb(0, 0, 0),
      });
      currentPage.drawText(`Date: ${new Date().toLocaleDateString()}`, {
        x: width - 150,
        y: height - 30,
        font,
        size: 10,
        color: rgb(0, 0, 0),
      });
      currentPage.drawText(
        `Page ${pdfDoc.getPages().indexOf(currentPage) + 1} of ${totalPages}`,
        { x: width / 2 - 30, y: 20, font, size: 8, color: rgb(0, 0, 0) },
      );
    };

    drawHeader(page, 1);
    y -= 40;

    const startX = 50;
    const colWidths = [120, 80, 100, 80, 80]; // Project Name, WBS Code, Item Description, Amount Paid, Variance Flag
    const tableHeaders = [
      "Project Name",
      "WBS Code",
      "Description",
      "Amount Paid",
      "Variance",
    ];
    const rowHeight = 20;

    const drawTableRow = (data: string[], isHeader = false) => {
      let currentX = startX;
      data.forEach((text, index) => {
        page.drawText(text, {
          x: currentX + 5,
          y: y,
          font: isHeader ? boldFont : font,
          size: 10,
          color: rgb(0, 0, 0),
        });
        currentX += colWidths[index];
      });
      y -= rowHeight;
      page.drawLine({
        start: { x: startX, y: y + rowHeight },
        end: {
          x: startX + colWidths.reduce((a, b) => a + b, 0),
          y: y + rowHeight,
        },
        color: rgb(0.7, 0.7, 0.7),
        thickness: 0.5,
      });
    };

    drawTableRow(tableHeaders, true);
    y -= 5;

    let currentProjectNameLive = '';

    for (const expense of expenses) {
      const projName = context?.projectMap?.[(expense as any).project_id] || expense.wbsBudget?.project?.project_name || "Global Portfolio";

      if (projName !== currentProjectNameLive && context?.projectMap) {
        currentProjectNameLive = projName;
        if (y < 100) {
          page = pdfDoc.addPage(PageSizes.A4);
          y = height - 50;
          drawHeader(page, 1);
          y -= 40;
          drawTableRow(tableHeaders, true);
          y -= 5;
        }
        
        page.drawRectangle({
          x: startX,
          y: y - 7,
          width: colWidths.reduce((a, b) => a + b, 0),
          height: 22,
          color: rgb(0.9, 0.95, 1),
        });
        page.drawText(`Project: ${projName}`, {
          x: startX + 5,
          y: y - 1,
          font: boldFont,
          size: 11,
          color: rgb(0.1, 0.3, 0.6),
        });
        y -= 25;
      }

      if (y < 70) {
        page = pdfDoc.addPage(PageSizes.A4);
        y = height - 50;
        drawHeader(page, 1);
        y -= 40;
        drawTableRow(tableHeaders, true);
        y -= 5;
      }

      const rowData = [
        projName,
        expense.wbsBudget?.wbs_code || "N/A",
        expense.description,
        PdfUtility.formatCurrencyWithContext(expense.amount, context),
        expense.variance_flag,
      ];
      drawTableRow(rowData);
    }

    const totalPages = pdfDoc.getPages().length;
    for (let i = 0; i < totalPages; i++) {
      drawHeader(pdfDoc.getPages()[i], totalPages);
    }

    return pdfDoc.save();
  }

  static async generateOperationalBudgetReport(
    budgets: OperationalBudgetEntity[],
    title: string = "Operational Budget Report", context?: any,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    let y = height - 50;

    const drawHeader = (currentPage: PDFPage, totalPages: number) => {
      currentPage.drawText(context?.tenantName || "SentinelFi", { x: 50, y: height - 20, font: boldFont, size: 10, color: rgb(0.5, 0.5, 0.5) });
      currentPage.drawText(context?.projectName ? `${title} - ${context.projectName}` : title, { x: 50, y: height - 35, font: boldFont, size: 14, color: rgb(0, 0, 0) });
      currentPage.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: width - 150, y: height - 30, font, size: 10, color: rgb(0, 0, 0) });
      currentPage.drawText(`Page ${pdfDoc.getPages().indexOf(currentPage) + 1} of ${totalPages}`, { x: width / 2 - 30, y: 20, font, size: 8, color: rgb(0, 0, 0) });
    };

    drawHeader(page, 1);
    y -= 40;

    const startX = 50;
    const colWidths = [120, 100, 80, 80, 80];
    const tableHeaders = ["Budget Name", "Type", "Budgeted", "Actual Spent", "Status"];
    const rowHeight = 20;

    const drawTableRow = (data: string[], isHeader = false) => {
      let currentX = startX;
      data.forEach((text, index) => {
        page.drawText(text, { x: currentX + 5, y: y, font: isHeader ? boldFont : font, size: 10, color: rgb(0, 0, 0) });
        currentX += colWidths[index];
      });
      y -= rowHeight;
      page.drawLine({ start: { x: startX, y: y + rowHeight }, end: { x: startX + colWidths.reduce((a, b) => a + b, 0), y: y + rowHeight }, color: rgb(0.7, 0.7, 0.7), thickness: 0.5 });
    };

    drawTableRow(tableHeaders, true);
    y -= 5;

    for (const budget of budgets) {
      if (y < 70) {
        page = pdfDoc.addPage(PageSizes.A4);
        y = height - 50;
        drawHeader(page, 1);
        y -= 40;
        drawTableRow(tableHeaders, true);
        y -= 5;
      }
      drawTableRow([budget.name, budget.type, PdfUtility.formatCurrencyWithContext(budget.budgeted_amount, context), PdfUtility.formatCurrencyWithContext(budget.actual_spent, context), budget.status]);
    }

    const totalPages = pdfDoc.getPages().length;
    for (let i = 0; i < totalPages; i++) drawHeader(pdfDoc.getPages()[i], totalPages);
    return pdfDoc.save();
  }

  /**
   * OPEX Rollup Report — Full hierarchical Budget → Category structure
   * with burn rates, variance, and status indicators.
   */
  static async generateOpexRollupReport(
    data: { budgets: any[]; summary: any },
    title: string = "OPEX Efficiency Intelligence Report", context?: any,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    let y = height - 50;

    const BRAND_BLUE = rgb(0.06, 0.51, 0.89);
    const RED = rgb(0.86, 0.15, 0.15);
    const AMBER = rgb(0.93, 0.65, 0.10);
    const GREEN = rgb(0.10, 0.65, 0.35);
    const GRAY = rgb(0.55, 0.55, 0.55);
    const LIGHT_GRAY = rgb(0.93, 0.93, 0.93);
    const BLACK = rgb(0, 0, 0);

    const safeTruncate = (text: string, maxLen: number) =>
      text && text.length > maxLen ? text.substring(0, maxLen - 1) + '…' : (text || '');

    const drawPageHeader = (currentPage: PDFPage) => {
      currentPage.drawText(context?.tenantName || "SentinelFi", { x: 50, y: height - 20, font: boldFont, size: 10, color: rgb(0.5, 0.5, 0.5) });
      currentPage.drawText(context?.projectName ? `${title} - ${context.projectName}` : title, { x: 50, y: height - 35, font: boldFont, size: 14, color: BLACK });
      currentPage.drawText(`Generated: ${new Date().toLocaleDateString()}`, { x: width - 160, y: height - 35, font, size: 9, color: GRAY });
      const pg = pdfDoc.getPages().indexOf(currentPage) + 1;
      currentPage.drawText(`Page ${pg}`, { x: width / 2 - 15, y: 20, font, size: 8, color: GRAY });
    };

    drawPageHeader(page);
    y -= 50;

    // --- Summary KPI Block ---
    if (data.summary) {
      const s = data.summary;
      const kpis = [
        { label: 'Total Budget', value: PdfUtility.formatCurrencyWithContext(s.totalBudgeted, context) },
        { label: 'Total Actual', value: PdfUtility.formatCurrencyWithContext(s.totalActual, context) },
        { label: 'Net Variance', value: `${s.totalVariance >= 0 ? '+' : ''}${PdfUtility.formatCurrencyWithContext(s.totalVariance, context)}` },
        { label: 'Efficiency', value: `${s.efficiencyScore?.toFixed(1)}%` },
      ];
      const kpiW = (width - 100) / kpis.length;
      kpis.forEach((kpi, i) => {
        const kx = 50 + i * kpiW;
        page.drawRectangle({ x: kx + 2, y: y - 40, width: kpiW - 4, height: 45, color: LIGHT_GRAY });
        page.drawText(kpi.label, { x: kx + 8, y: y - 5, font: boldFont, size: 7, color: GRAY });
        page.drawText(kpi.value, { x: kx + 8, y: y - 25, font: boldFont, size: 11, color: BRAND_BLUE });
      });
      y -= 60;
    }

    // --- Budget Header Columns ---
    const BUD_COLS = [170, 70, 90, 90, 70]; // Name, Type, Budget, Actual, Burn
    const CAT_COLS = [50, 160, 90, 90, 70]; // indent, Name, Budget, Actual, Burn
    const startX = 50;

    const drawBudgetHeader = () => {
      const headers = ['Budget Name', 'Type', 'Budget', 'Actual Burn', 'Burn%'];
      let cx = startX;
      page.drawRectangle({ x: startX, y: y - 16, width: BUD_COLS.reduce((a, b) => a + b, 0), height: 18, color: rgb(0.10, 0.10, 0.18) });
      headers.forEach((h, i) => {
        page.drawText(h, { x: cx + 4, y: y - 11, font: boldFont, size: 8, color: rgb(1, 1, 1) });
        cx += BUD_COLS[i];
      });
      y -= 20;
    };

    drawBudgetHeader();

    for (const budget of data.budgets ?? []) {
      // Check space for budget row + at least 1 category row
      if (y < 100) {
        page = pdfDoc.addPage(PageSizes.A4);
        y = height - 50;
        drawPageHeader(page);
        y -= 30;
        drawBudgetHeader();
      }

      const status = budget.burnRate > 100 ? 'OVERRUN' : budget.burnRate > 85 ? 'AT RISK' : 'OK';
      const statusColor = budget.burnRate > 100 ? RED : budget.burnRate > 85 ? AMBER : GREEN;

      // Budget row background
      page.drawRectangle({ x: startX, y: y - 16, width: BUD_COLS.reduce((a, b) => a + b, 0), height: 18, color: rgb(0.96, 0.96, 0.98) });

      let cx = startX;
      const budgetRowData = [
        safeTruncate(budget.name, 28),
        safeTruncate(budget.type, 12),
        PdfUtility.formatCurrencyWithContext(budget.budgeted, context),
        PdfUtility.formatCurrencyWithContext(budget.actual, context),
        `${budget.burnRate?.toFixed(1)}%`,
      ];
      budgetRowData.forEach((text, i) => {
        const isLast = i === budgetRowData.length - 1;
        page.drawText(text, { x: cx + 4, y: y - 11, font: boldFont, size: 9, color: isLast ? statusColor : BLACK });
        cx += BUD_COLS[i];
      });

      page.drawText(status, { x: cx - 70, y: y - 11, font: boldFont, size: 7, color: statusColor });
      y -= 20;

      // Category rows
      for (const cat of budget.categories ?? []) {
        if (y < 60) {
          page = pdfDoc.addPage(PageSizes.A4);
          y = height - 50;
          drawPageHeader(page);
          y -= 30;
          drawBudgetHeader();
        }

        const catStatus = cat.burnRate > 100 ? RED : cat.burnRate > 85 ? AMBER : GREEN;
        let catx = startX;
        const catData = [
          '  ↳',
          safeTruncate(cat.name, 28),
          PdfUtility.formatCurrencyWithContext(cat.budgeted, context),
          PdfUtility.formatCurrencyWithContext(cat.actual, context),
          `${cat.burnRate?.toFixed(1)}%`,
        ];
        catData.forEach((text, i) => {
          const isLast = i === catData.length - 1;
          page.drawText(text, { x: catx + 4, y: y - 8, font: i === 0 ? font : font, size: 8, color: isLast ? catStatus : GRAY });
          catx += CAT_COLS[i];
        });

        page.drawLine({ start: { x: startX + 15, y: y - 10 }, end: { x: startX + BUD_COLS.reduce((a, b) => a + b, 0), y: y - 10 }, color: rgb(0.90, 0.90, 0.90), thickness: 0.3 });
        y -= 14;
      }

      y -= 4; // gap between budgets
    }

    const totalPages = pdfDoc.getPages().length;
    for (let i = 0; i < totalPages; i++) drawPageHeader(pdfDoc.getPages()[i]);

    return pdfDoc.save();
  }
}

