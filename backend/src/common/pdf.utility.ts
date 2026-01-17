import { PDFDocument, rgb, StandardFonts, PageSizes, PDFPage } from "pdf-lib";
import { ProjectEntity } from "../projects/project.entity";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { OperationalBudgetEntity } from "../operational-budgets/operational-budget.entity";
import { formatCurrency } from "../../../frontend/lib/utils"; // Reusing frontend utility for consistency

export class PdfUtility {
  static async generateProjectReport(
    projects: (ProjectEntity & {
      total_budgeted_rollup: number;
      total_paid_rollup: number;
    })[],
    title: string = "Project Portfolio Report",
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    let y = height - 50;

    const drawHeader = (currentPage: PDFPage, totalPages: number) => {
      currentPage.drawText(title, {
        x: 50,
        y: height - 30,
        font: boldFont,
        size: 18,
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
        formatCurrency(project.total_budgeted_rollup),
        formatCurrency(project.total_paid_rollup),
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
    title: string = "WBS Budget Report",
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    let y = height - 50;

    const drawHeader = (currentPage: PDFPage, totalPages: number) => {
      currentPage.drawText(title, {
        x: 50,
        y: height - 30,
        font: boldFont,
        size: 18,
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

    for (const budget of budgets) {
      if (y < 70) {
        page = pdfDoc.addPage(PageSizes.A4);
        y = height - 50;
        drawHeader(page, 1);
        y -= 40;
        drawTableRow(tableHeaders, true);
        y -= 5;
      }

      const rowData = [
        budget.project?.project_name || "N/A",
        budget.wbs_code,
        budget.description,
        formatCurrency(budget.total_cost_budgeted),
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
    title: string = "Live Expense Report",
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    let y = height - 50;

    const drawHeader = (currentPage: PDFPage, totalPages: number) => {
      currentPage.drawText(title, {
        x: 50,
        y: height - 30,
        font: boldFont,
        size: 18,
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

    for (const expense of expenses) {
      if (y < 70) {
        page = pdfDoc.addPage(PageSizes.A4);
        y = height - 50;
        drawHeader(page, 1);
        y -= 40;
        drawTableRow(tableHeaders, true);
        y -= 5;
      }

      const rowData = [
        expense.wbsBudget?.project?.project_name || "N/A",
        expense.wbsBudget?.wbs_code || "N/A",
        expense.description,
        formatCurrency(expense.amount),
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
    title: string = "Operational Budget Report",
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    let y = height - 50;

    const drawHeader = (currentPage: PDFPage, totalPages: number) => {
      currentPage.drawText(title, {
        x: 50,
        y: height - 30,
        font: boldFont,
        size: 18,
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
    const colWidths = [120, 100, 80, 80, 80]; // Name, Type, Budgeted, Spent, Status
    const tableHeaders = [
      "Budget Name",
      "Type",
      "Budgeted",
      "Actual Spent",
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

    for (const budget of budgets) {
      if (y < 70) {
        page = pdfDoc.addPage(PageSizes.A4);
        y = height - 50;
        drawHeader(page, 1);
        y -= 40;
        drawTableRow(tableHeaders, true);
        y -= 5;
      }

      const rowData = [
        budget.name,
        budget.type,
        formatCurrency(budget.budgeted_amount),
        formatCurrency(budget.actual_spent),
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
}
