import * as ExcelJS from "exceljs";
import { ProjectEntity } from "../projects/project.entity";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { OperationalBudgetEntity } from "../operational-budgets/operational-budget.entity";
import { formatCurrency } from "../../../frontend/lib/utils"; // Reusing frontend utility for consistency

export class ExcelUtility {
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
        top: { style: "thin" }, bottom: { style: "thin" },
        left: { style: "thin" }, right: { style: "thin" },
      };
    });
  }

  private static applyRowStyle(worksheet: ExcelJS.Worksheet, rowNum: number) {
    worksheet.getRow(rowNum).eachCell((cell: ExcelJS.Cell) => {
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        top: { style: "thin" }, bottom: { style: "thin" },
        left: { style: "thin" }, right: { style: "thin" },
      };
    });
  }

  static async generateProjectReport(projects: (ProjectEntity & { total_budgeted_rollup: number; total_paid_rollup: number })[], title: string = "Project Portfolio Report"): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

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
      const variance = project.total_budgeted_rollup > 0 ? ((project.total_paid_rollup - project.total_budgeted_rollup) / project.total_budgeted_rollup) * 100 : 0;
      worksheet.addRow({
        project_name: project.project_name,
        rfq_number: project.rfq_number,
        sow_details: project.sow_details,
        status: project.status,
        total_budgeted: formatCurrency(project.total_budgeted_rollup),
        total_spent: formatCurrency(project.total_paid_rollup),
        variance_percent: `${variance.toFixed(2)}%`,
      });
      ExcelUtility.applyRowStyle(worksheet, index + 2); // +2 because 1 for header row, +1 for 0-indexed array
    });

    return workbook.xlsx.writeBuffer();
  }

  static async generateWbsBudgetReport(budgets: WbsBudgetEntity[], title: string = "WBS Budget Report"): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

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
        unit_cost_budgeted: formatCurrency(budget.unit_cost_budgeted),
        quantity_budgeted: budget.quantity_budgeted,
        total_cost_budgeted: formatCurrency(budget.total_cost_budgeted),
        days_budgeted: budget.days_budgeted,
        status: budget.status,
        created_by_email: budget.user?.email || "N/A",
        created_at: budget.created_at.toISOString().split("T")[0],
      });
      ExcelUtility.applyRowStyle(worksheet, index + 2);
    });

    return workbook.xlsx.writeBuffer();
  }

  static async generateLiveExpenseReport(expenses: LiveExpenseEntity[], title: string = "Live Expense Report"): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    worksheet.columns = [
      { header: "Project Name", key: "project_name", width: 30 },
      { header: "WBS Code", key: "wbs_code", width: 15 },
      { header: "Description", key: "description", width: 40 },
      { header: "Expense Date", key: "expense_date", width: 15 },
      { header: "Unit Cost", key: "unit_cost", width: 20 },
      { header: "Quantity", key: "quantity", width: 15 },
      { header: "Commitment LPO Amount", key: "commitment_lpo_amount", width: 25 },
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
        unit_cost: formatCurrency(expense.unit_cost),
        quantity: expense.quantity,
        commitment_lpo_amount: formatCurrency(expense.commitment_lpo_amount),
        amount: formatCurrency(expense.amount),
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

  static async generateOperationalBudgetReport(budgets: OperationalBudgetEntity[], title: string = "Operational Budget Report"): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

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
        budgeted_amount: formatCurrency(budget.budgeted_amount),
        actual_spent: formatCurrency(budget.actual_spent),
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
}
