import * as ExcelJS from "exceljs";
import { ProjectEntity } from "../projects/project.entity";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { OperationalBudgetEntity } from "../operational-budgets/operational-budget.entity";
import { formatCurrency } from "../../../frontend/lib/utils"; // Reusing frontend utility for consistency

export class ExcelUtility {
  static formatCurrencyWithContext(amount: number, context?: any): string {
    if (context && context.currencyRate && context.currencySymbol) {
      const converted = amount * context.currencyRate;
      return `${context.currencySymbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return ExcelUtility.formatCurrencyWithContext(amount, context);
  }

  private static applyHeaderStyle(worksheet: ExcelJS.Worksheet) {
    worksheet.getRow(1).height = 25;
    worksheet.getRow(1).eachCell((cell: ExcelJS.Cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // White text
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1A202C" }, // Dark background, adjust as needed
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
  }

  private static applyRowStyle(worksheet: ExcelJS.Worksheet, rowNum: number) {
    worksheet.getRow(rowNum).eachCell((cell: ExcelJS.Cell) => {
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
  }

  static async generateProjectReport(
    projects: (ProjectEntity & {
      total_budgeted_rollup: number;
      total_paid_rollup: number;
    })[],
    title: string = "Project Portfolio Report", context?: any,
  ): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheetTitle = context?.projectName ? context.projectName.substring(0,30).replace(/[^a-zA-Z0-9 ]/g, "") : title.substring(0, 30);
    const worksheet = workbook.addWorksheet(sheetTitle);
    worksheet.getCell('A1').value = context?.tenantName || "SentinelFi";
    worksheet.getCell('A1').font = { bold: true, color: { argb: 'FF4A5568' } };
    worksheet.getCell('A2').value = title;
    worksheet.getCell('A2').font = { bold: true, size: 14 };
    worksheet.getCell('A3').value = `Date: ${new Date().toLocaleDateString()}`;
    // Shift rowNum in applyRowStyle later if needed, but here we just added 3 info rows.
    

    // Set columns
    worksheet.columns = [
      { header: "Project Name", key: "project_name", width: 30 },
      { header: "RFQ Number", key: "rfq_number", width: 20 },
      { header: "SOW Details", key: "sow_details", width: 40 },
      { header: "Status", key: "status", width: 15 },
      { header: "Total Budgeted", key: "total_budgeted", width: 20 },
      { header: "Total Spent", key: "total_spent", width: 20 },
      { header: "Variance (%)", key: "variance_percent", width: 15 },
    ];

    ExcelUtility.applyHeaderStyle(worksheet);

    projects.forEach((project, index) => {
      const variance =
        project.total_budgeted_rollup > 0
          ? ((project.total_paid_rollup - project.total_budgeted_rollup) /
              project.total_budgeted_rollup) *
            100
          : 0;
      worksheet.addRow({
        project_name: project.project_name,
        rfq_number: project.rfq_number,
        sow_details: project.sow_details,
        status: project.status,
        total_budgeted: ExcelUtility.formatCurrencyWithContext(project.total_budgeted_rollup, context),
        total_spent: ExcelUtility.formatCurrencyWithContext(project.total_paid_rollup, context),
        variance_percent: `${variance.toFixed(2)}%`,
      });
      ExcelUtility.applyRowStyle(worksheet, index + 2); // +2 because 1 for header row, +1 for 0-indexed array
    });

    return workbook.xlsx.writeBuffer();
  }

  static async generateWbsBudgetReport(
    budgets: WbsBudgetEntity[],
    title: string = "WBS Budget Report", context?: any,
  ): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheetTitle = context?.projectName ? context.projectName.substring(0,30).replace(/[^a-zA-Z0-9 ]/g, "") : title.substring(0, 30);
    const worksheet = workbook.addWorksheet(sheetTitle);
    worksheet.getCell('A1').value = context?.tenantName || "SentinelFi";
    worksheet.getCell('A1').font = { bold: true, color: { argb: 'FF4A5568' } };
    worksheet.getCell('A2').value = title;
    worksheet.getCell('A2').font = { bold: true, size: 14 };
    worksheet.getCell('A3').value = `Date: ${new Date().toLocaleDateString()}`;
    

    worksheet.columns = [
      { header: "Project Name", key: "project_name", width: 30 },
      { header: "WBS Code", key: "wbs_code", width: 15 },
      { header: "Description", key: "description", width: 40 },
      { header: "Unit Cost Budgeted", key: "unit_cost_budgeted", width: 20 },
      { header: "Quantity Budgeted", key: "quantity_budgeted", width: 15 },
      { header: "Total Cost Budgeted", key: "total_cost_budgeted", width: 20 },
      { header: "Duration Days", key: "days_budgeted", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Created By", key: "created_by_email", width: 25 },
      { header: "Created At", key: "created_at", width: 20 },
    ];

    ExcelUtility.applyHeaderStyle(worksheet);

    budgets.forEach((budget, index) => {
      worksheet.addRow({
        project_name: budget.project?.project_name || "N/A",
        wbs_code: budget.wbs_code,
        description: budget.description,
        unit_cost_budgeted: ExcelUtility.formatCurrencyWithContext(budget.unit_cost_budgeted, context),
        quantity_budgeted: budget.quantity_budgeted,
        total_cost_budgeted: ExcelUtility.formatCurrencyWithContext(budget.total_cost_budgeted, context),
        days_budgeted: budget.days_budgeted,
        status: budget.status,
        created_by_email: budget.user?.email || "N/A",
        created_at: budget.created_at.toISOString().split("T")[0],
      });
      ExcelUtility.applyRowStyle(worksheet, index + 2);
    });

    return workbook.xlsx.writeBuffer();
  }

  static async generateLiveExpenseReport(
    expenses: LiveExpenseEntity[],
    title: string = "Live Expense Report", context?: any,
  ): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheetTitle = context?.projectName ? context.projectName.substring(0,30).replace(/[^a-zA-Z0-9 ]/g, "") : title.substring(0, 30);
    const worksheet = workbook.addWorksheet(sheetTitle);
    worksheet.getCell('A1').value = context?.tenantName || "SentinelFi";
    worksheet.getCell('A1').font = { bold: true, color: { argb: 'FF4A5568' } };
    worksheet.getCell('A2').value = title;
    worksheet.getCell('A2').font = { bold: true, size: 14 };
    worksheet.getCell('A3').value = `Date: ${new Date().toLocaleDateString()}`;
    

    worksheet.columns = [
      { header: "Project Name", key: "project_name", width: 30 },
      { header: "WBS Code", key: "wbs_code", width: 15 },
      { header: "Description", key: "description", width: 40 },
      { header: "Expense Date", key: "expense_date", width: 15 },
      { header: "Unit Cost", key: "unit_cost", width: 20 },
      { header: "Quantity", key: "quantity", width: 15 },
      {
        header: "Commitment LPO Amount",
        key: "commitment_lpo_amount",
        width: 25,
      },
      { header: "Amount", key: "amount", width: 20 },
      { header: "Variance Flag", key: "variance_flag", width: 20 },
      { header: "Document Reference", key: "document_reference", width: 25 },
      { header: "Notes Justification", key: "notes_justification", width: 30 },
      { header: "User Email", key: "user_email", width: 25 },
      { header: "Created At", key: "created_at", width: 20 },
    ];

    ExcelUtility.applyHeaderStyle(worksheet);

    expenses.forEach((expense, index) => {
      worksheet.addRow({
        project_name: expense.wbsBudget?.project?.project_name || "N/A",
        wbs_code: expense.wbsBudget?.wbs_code || "N/A",
        description: expense.description,
        expense_date: expense.expense_date.toISOString().split("T")[0],
        unit_cost: ExcelUtility.formatCurrencyWithContext(expense.unit_cost, context),
        quantity: expense.quantity,
        commitment_lpo_amount: ExcelUtility.formatCurrencyWithContext(expense.commitment_lpo_amount, context),
        amount: ExcelUtility.formatCurrencyWithContext(expense.amount, context),
        variance_flag: expense.variance_flag,
        document_reference: expense.document_reference,
        notes_justification: expense.notes_justification,
        user_email: expense.wbsBudget?.user?.email || "N/A",
        created_at: expense.created_at.toISOString().split("T")[0],
      });
      ExcelUtility.applyRowStyle(worksheet, index + 2);
    });

    return workbook.xlsx.writeBuffer();
  }

  static async generateOperationalBudgetReport(
    budgets: OperationalBudgetEntity[],
    title: string = "Operational Budget Report", context?: any,
  ): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheetTitle = context?.projectName ? context.projectName.substring(0,30).replace(/[^a-zA-Z0-9 ]/g, "") : title.substring(0, 30);
    const worksheet = workbook.addWorksheet(sheetTitle);
    worksheet.getCell('A1').value = context?.tenantName || "SentinelFi";
    worksheet.getCell('A1').font = { bold: true, color: { argb: 'FF4A5568' } };
    worksheet.getCell('A2').value = title;
    worksheet.getCell('A2').font = { bold: true, size: 14 };
    worksheet.getCell('A3').value = `Date: ${new Date().toLocaleDateString()}`;
    

    worksheet.columns = [
      { header: "Budget Name", key: "name", width: 30 },
      { header: "Description", key: "description", width: 40 },
      { header: "Type", key: "type", width: 20 },
      { header: "Budgeted Amount", key: "budgeted_amount", width: 20 },
      { header: "Actual Spent", key: "actual_spent", width: 20 },
      { header: "Start Date", key: "start_date", width: 15 },
      { header: "End Date", key: "end_date", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Created By", key: "created_by_user_id", width: 25 },
      { header: "Created At", key: "created_at", width: 20 },
    ];

    ExcelUtility.applyHeaderStyle(worksheet);

    budgets.forEach((budget, index) => {
      worksheet.addRow({
        name: budget.name,
        description: budget.description,
        type: budget.type,
        budgeted_amount: ExcelUtility.formatCurrencyWithContext(budget.budgeted_amount, context),
        actual_spent: ExcelUtility.formatCurrencyWithContext(budget.actual_spent, context),
        start_date: budget.start_date.toISOString().split("T")[0],
        end_date: budget.end_date.toISOString().split("T")[0],
        status: budget.status,
        created_by_user_id: budget.created_by_user_id, // Assuming this is email or name for display
        created_at: budget.created_at.toISOString().split("T")[0],
      });
      ExcelUtility.applyRowStyle(worksheet, index + 2);
    });

    return workbook.xlsx.writeBuffer();
  }

  /**
   * OPEX Rollup Excel Report — Full Budget → Category Structure
   * Produces a 2-sheet workbook:
   *   Sheet 1: Portfolio Summary KPIs
   *   Sheet 2: Hierarchical Budget → Category Breakdown
   */
  static async generateOpexRollupReport(
    data: { budgets: any[]; summary: any },
    title: string = "OPEX Efficiency Intelligence", context?: any,
  ): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SentinelFi';
    workbook.created = new Date();

    // --- Sheet 1: Summary ---
    const summarySheet = workbook.addWorksheet('Portfolio Summary');
    summarySheet.getColumn(1).width = 30;
    summarySheet.getColumn(2).width = 25;

    summarySheet.getCell('A1').value = context?.tenantName || "SentinelFi";
    summarySheet.getCell('A1').font = { bold: true, color: { argb: 'FF4A5568' } };
    summarySheet.addRow([context?.projectName ? `${title} - ${context.projectName}` : title]).font = { bold: true, size: 14 };
    summarySheet.addRow([`Generated: ${new Date().toLocaleDateString()}`]).font = { italic: true, color: { argb: 'FF888888' } };
    summarySheet.addRow([]);

    const kpiHeader = summarySheet.addRow(['KPI', 'Value']);
    kpiHeader.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A202C' } };
    });

    if (data.summary) {
      const s = data.summary;
      [
        ['Total OPEX Budget', ExcelUtility.formatCurrencyWithContext(s.totalBudgeted, context)],
        ['Total Actual Burn', ExcelUtility.formatCurrencyWithContext(s.totalActual, context)],
        ['Net Variance', `${s.totalVariance >= 0 ? '+' : ''}${ExcelUtility.formatCurrencyWithContext(s.totalVariance, context)}`],
        ['Efficiency Score', `${s.efficiencyScore?.toFixed(1)}%`],
      ].forEach(([k, v], i) => {
        const row = summarySheet.addRow([k, v]);
        row.getCell(2).alignment = { horizontal: 'right' };
        if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } };
      });

      summarySheet.addRow([]);
      summarySheet.addRow(['Top Burning Categories', 'Burn Rate']).eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4B5' } };
      });
      (s.topBurningCategories || []).forEach((cat: any) => {
        const row = summarySheet.addRow([cat.name, `${cat.burnRate?.toFixed(1)}%`]);
        const burnRate = cat.burnRate || 0;
        if (burnRate > 100) row.getCell(2).font = { color: { argb: 'FFDC2626' }, bold: true };
        else if (burnRate > 85) row.getCell(2).font = { color: { argb: 'FFD97706' }, bold: true };
        else row.getCell(2).font = { color: { argb: 'FF059669' }, bold: true };
      });
    }

    // --- Sheet 2: Full Breakdown ---
    const detailSheet = workbook.addWorksheet('Budget-Category Breakdown');
    detailSheet.columns = [
      { header: 'Budget / Category', key: 'name', width: 35 },
      { header: 'Type', key: 'type', width: 18 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Budgeted', key: 'budgeted', width: 20 },
      { header: 'Actual Burn', key: 'actual', width: 20 },
      { header: 'Variance', key: 'variance', width: 20 },
      { header: 'Burn Rate %', key: 'burnRate', width: 14 },
      { header: 'Health', key: 'health', width: 12 },
    ];

    // Style header row
    detailSheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A202C' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    let rowNum = 2;
    for (const budget of data.budgets ?? []) {
      const health = budget.burnRate > 100 ? 'OVERRUN' : budget.burnRate > 85 ? 'AT RISK' : 'HEALTHY';
      // Budget parent row
      const budgetRow = detailSheet.addRow({
        name: budget.name,
        type: budget.type,
        status: budget.status,
        budgeted: budget.budgeted,
        actual: budget.actual,
        variance: budget.variance,
        burnRate: budget.burnRate,
        health,
      });
      budgetRow.eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF5' } };
      });
      const healthCell = budgetRow.getCell('health');
      if (health === 'OVERRUN') healthCell.font = { bold: true, color: { argb: 'FFDC2626' } };
      else if (health === 'AT RISK') healthCell.font = { bold: true, color: { argb: 'FFD97706' } };
      else healthCell.font = { bold: true, color: { argb: 'FF059669' } };
      rowNum++;

      // Category child rows
      for (const cat of budget.categories ?? []) {
        const catHealth = cat.burnRate > 100 ? 'OVERRUN' : cat.burnRate > 85 ? 'AT RISK' : 'HEALTHY';
        const catRow = detailSheet.addRow({
          name: `    ↳ ${cat.name}`,
          type: '',
          status: '',
          budgeted: cat.budgeted,
          actual: cat.actual,
          variance: cat.variance,
          burnRate: cat.burnRate,
          health: catHealth,
        });
        catRow.getCell('health').font = {
          color: { argb: catHealth === 'OVERRUN' ? 'FFDC2626' : catHealth === 'AT RISK' ? 'FFD97706' : 'FF059669' },
          bold: true,
        };
        catRow.getCell('name').font = { color: { argb: 'FF555555' } };
        // Number formatting
        ['budgeted', 'actual', 'variance'].forEach(key => {
          catRow.getCell(key).numFmt = '#,##0.00';
        });
        catRow.getCell('burnRate').numFmt = '0.00"%"';
        rowNum++;
      }
    }

    // Apply number format to budget rows too
    for (let i = 2; i < rowNum; i++) {
      ['budgeted', 'actual', 'variance'].forEach(key => {
        const col = detailSheet.getColumn(key);
        const cell = detailSheet.getRow(i).getCell(col.number);
        if (!cell.numFmt) cell.numFmt = '#,##0.00';
      });
    }

    return workbook.xlsx.writeBuffer();
  }
}

