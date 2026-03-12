import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  VerticalAlign,
} from "docx";
import { ProjectEntity } from "../projects/project.entity";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { OperationalBudgetEntity } from "../operational-budgets/operational-budget.entity";
import { formatCurrency } from "../../../frontend/lib/utils"; // Reusing frontend utility for consistency

export class WordUtility {
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
  ): Promise<Buffer> {
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                text: "Project Name",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 2500, type: WidthType.DXA },
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Budget",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 1500, type: WidthType.DXA },
          }),
          new TableCell({
            children: [
              new Paragraph({ text: "Spent", heading: HeadingLevel.HEADING_4 }),
            ],
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 1500, type: WidthType.DXA },
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Variance (%)",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 1500, type: WidthType.DXA },
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Status",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
            width: { size: 1500, type: WidthType.DXA },
          }),
        ],
      }),
      ...projects.map((project) => {
        const variance =
          project.total_budgeted_rollup > 0
            ? ((project.total_paid_rollup - project.total_budgeted_rollup) /
                project.total_budgeted_rollup) *
              100
            : 0;
        return new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(project.project_name)] }),
            new TableCell({
              children: [
                new Paragraph(WordUtility.formatCurrencyWithContext(project.total_budgeted_rollup, context)),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph(WordUtility.formatCurrencyWithContext(project.total_paid_rollup, context)),
              ],
            }),
            new TableCell({
              children: [new Paragraph(`${variance.toFixed(2)}%`)],
            }),
            new TableCell({ children: [new Paragraph(project.status)] }),
          ],
        });
      }),
    ];

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: context?.tenantName || "SentinelFi", bold: true, color: "4A5568", size: 20 })],
              alignment: AlignmentType.LEFT,
            }),
            new Paragraph({
              children: [new TextRun({ text: context?.projectName ? `${title} - ${context.projectName}` : title, bold: true, size: 32 })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Date: ${new Date().toLocaleDateString()}`,
                  size: 18,
                }),
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 400 },
            }),
            new Table({
              rows: tableRows,
              width: {
                size: 9000,
                type: WidthType.DXA,
              },
            }),
          ],
        },
      ],
    });

    return Packer.toBuffer(doc);
  }

  static async generateWbsBudgetReport(
    budgets: WbsBudgetEntity[],
    title: string = "WBS Budget Report", context?: any,
  ): Promise<Buffer> {
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                text: "Project Name",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "WBS Code",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Description",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Budgeted Amount",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Status",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
        ],
      }),
      ...budgets.map((budget) => {
        return new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(budget.project?.project_name || "N/A")],
            }),
            new TableCell({ children: [new Paragraph(budget.wbs_code)] }),
            new TableCell({ children: [new Paragraph(budget.description)] }),
            new TableCell({
              children: [
                new Paragraph(WordUtility.formatCurrencyWithContext(budget.total_cost_budgeted, context)),
              ],
            }),
            new TableCell({ children: [new Paragraph(budget.status)] }),
          ],
        });
      }),
    ];

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: context?.tenantName || "SentinelFi", bold: true, color: "4A5568", size: 20 })],
              alignment: AlignmentType.LEFT,
            }),
            new Paragraph({
              children: [new TextRun({ text: context?.projectName ? `${title} - ${context.projectName}` : title, bold: true, size: 32 })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Date: ${new Date().toLocaleDateString()}`,
                  size: 18,
                }),
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 400 },
            }),
            new Table({
              rows: tableRows,
              width: {
                size: 9000,
                type: WidthType.DXA,
              },
            }),
          ],
        },
      ],
    });

    return Packer.toBuffer(doc);
  }

  static async generateLiveExpenseReport(
    expenses: LiveExpenseEntity[],
    title: string = "Live Expense Report", context?: any,
  ): Promise<Buffer> {
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                text: "Project Name",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "WBS Code",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Description",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Amount Paid",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Variance",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
        ],
      }),
      ...expenses.map((expense) => {
        return new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph(
                  expense.wbsBudget?.project?.project_name || "N/A",
                ),
              ],
            }),
            new TableCell({
              children: [new Paragraph(expense.wbsBudget?.wbs_code || "N/A")],
            }),
            new TableCell({ children: [new Paragraph(expense.description)] }),
            new TableCell({
              children: [new Paragraph(WordUtility.formatCurrencyWithContext(expense.amount, context))],
            }),
            new TableCell({ children: [new Paragraph(expense.variance_flag)] }),
          ],
        });
      }),
    ];

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: context?.tenantName || "SentinelFi", bold: true, color: "4A5568", size: 20 })],
              alignment: AlignmentType.LEFT,
            }),
            new Paragraph({
              children: [new TextRun({ text: context?.projectName ? `${title} - ${context.projectName}` : title, bold: true, size: 32 })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Date: ${new Date().toLocaleDateString()}`,
                  size: 18,
                }),
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 400 },
            }),
            new Table({
              rows: tableRows,
              width: {
                size: 9000,
                type: WidthType.DXA,
              },
            }),
          ],
        },
      ],
    });

    return Packer.toBuffer(doc);
  }

  static async generateOperationalBudgetReport(
    budgets: OperationalBudgetEntity[],
    title: string = "Operational Budget Report", context?: any,
  ): Promise<Buffer> {
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                text: "Budget Name",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({ text: "Type", heading: HeadingLevel.HEADING_4 }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Budgeted",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Actual Spent",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [
              new Paragraph({
                text: "Status",
                heading: HeadingLevel.HEADING_4,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
        ],
      }),
      ...budgets.map((budget) => {
        return new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(budget.name)] }),
            new TableCell({ children: [new Paragraph(budget.type)] }),
            new TableCell({
              children: [new Paragraph(WordUtility.formatCurrencyWithContext(budget.budgeted_amount, context))],
            }),
            new TableCell({
              children: [new Paragraph(WordUtility.formatCurrencyWithContext(budget.actual_spent, context))],
            }),
            new TableCell({ children: [new Paragraph(budget.status)] }),
          ],
        });
      }),
    ];

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: context?.tenantName || "SentinelFi", bold: true, color: "4A5568", size: 20 })],
              alignment: AlignmentType.LEFT,
            }),
            new Paragraph({
              children: [new TextRun({ text: context?.projectName ? `${title} - ${context.projectName}` : title, bold: true, size: 32 })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Date: ${new Date().toLocaleDateString()}`,
                  size: 18,
                }),
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 400 },
            }),
            new Table({
              rows: tableRows,
              width: {
                size: 9000,
                type: WidthType.DXA,
              },
            }),
          ],
        },
      ],
    });

    return Packer.toBuffer(doc);
  }

  /**
   * OPEX Rollup Word Report — Full Budget → Category Structure
   * Generates a professional .docx with KPI summary + hierarchical breakdown table.
   */
  static async generateOpexRollupReport(
    data: { budgets: any[]; summary: any },
    title: string = "OPEX Efficiency Intelligence Report", context?: any,
  ): Promise<Buffer> {
    const makeCell = (text: string, opts: { bold?: boolean; shade?: boolean; indent?: boolean; color?: string } = {}) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text, bold: opts.bold ?? false, color: opts.color ?? '000000', size: opts.indent ? 18 : 20 })],
            indent: opts.indent ? { left: 400 } : undefined,
          }),
        ],
        shading: opts.shade ? { fill: 'E8EDF5' } : undefined,
        verticalAlign: VerticalAlign.CENTER,
      });

    // --- KPI Summary Table ---
    const s = data.summary || {};
    const kpiRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'OPEX Portfolio Summary', bold: true, size: 24 })] })], columnSpan: 2, shading: { fill: '1A202C' } }),
        ],
      }),
      ...([
        ['Total OPEX Budget', WordUtility.formatCurrencyWithContext(s.totalBudgeted ?? 0, context)],
        ['Total Actual Burn', WordUtility.formatCurrencyWithContext(s.totalActual ?? 0, context)],
        ['Net Variance', `${(s.totalVariance ?? 0) >= 0 ? '+' : ''}${WordUtility.formatCurrencyWithContext(s.totalVariance ?? 0, context)}`],
        ['Efficiency Score', `${(s.efficiencyScore ?? 100).toFixed(1)}%`],
      ] as [string, string][]).map(([k, v]) => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k, bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v })] })] }),
        ],
      })),
    ];

    // --- Breakdown Table ---
    const breakdownHeader = new TableRow({
      tableHeader: true,
      children: ['Budget / Category', 'Budgeted', 'Actual Burn', 'Variance', 'Burn %', 'Health'].map(h =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF' })] })],
          shading: { fill: '1A202C' },
          width: { size: h === 'Budget / Category' ? 3200 : 1200, type: WidthType.DXA },
        })
      ),
    });

    const breakdownRows: TableRow[] = [breakdownHeader];

    for (const budget of data.budgets ?? []) {
      const health = budget.burnRate > 100 ? 'OVERRUN' : budget.burnRate > 85 ? 'AT RISK' : 'OK';
      const healthColor = budget.burnRate > 100 ? 'DC2626' : budget.burnRate > 85 ? 'D97706' : '059669';

      // Budget parent row
      breakdownRows.push(new TableRow({
        children: [
          makeCell(budget.name, { bold: true, shade: true }),
          makeCell(WordUtility.formatCurrencyWithContext(budget.budgeted, context), { bold: true, shade: true }),
          makeCell(WordUtility.formatCurrencyWithContext(budget.actual, context), { bold: true, shade: true }),
          makeCell(`${(budget.variance ?? 0) >= 0 ? '+' : ''}${WordUtility.formatCurrencyWithContext(budget.variance, context)}`, { bold: true, shade: true }),
          makeCell(`${(budget.burnRate ?? 0).toFixed(1)}%`, { bold: true, shade: true, color: healthColor }),
          makeCell(health, { bold: true, shade: true, color: healthColor }),
        ],
      }));

      // Category child rows
      for (const cat of budget.categories ?? []) {
        const catHealth = cat.burnRate > 100 ? 'OVERRUN' : cat.burnRate > 85 ? 'AT RISK' : 'OK';
        const catColor = cat.burnRate > 100 ? 'DC2626' : cat.burnRate > 85 ? 'D97706' : '059669';
        breakdownRows.push(new TableRow({
          children: [
            makeCell(`↳ ${cat.name}`, { indent: true }),
            makeCell(WordUtility.formatCurrencyWithContext(cat.budgeted, context)),
            makeCell(WordUtility.formatCurrencyWithContext(cat.actual, context)),
            makeCell(`${(cat.variance ?? 0) >= 0 ? '+' : ''}${WordUtility.formatCurrencyWithContext(cat.variance, context)}`),
            makeCell(`${(cat.burnRate ?? 0).toFixed(1)}%`, { color: catColor }),
            makeCell(catHealth, { color: catColor }),
          ],
        }));
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: context?.tenantName || "SentinelFi", bold: true, color: "4A5568", size: 20 })],
            alignment: AlignmentType.LEFT,
          }),
          new Paragraph({ children: [new TextRun({ text: context?.projectName ? `${title} - ${context.projectName}` : title, bold: true, size: 36 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString()}`, size: 18, color: '888888' })], alignment: AlignmentType.RIGHT, spacing: { after: 400 } }),
          new Table({ rows: kpiRows, width: { size: 4800, type: WidthType.DXA } }),
          new Paragraph({ text: '', spacing: { after: 400 } }),
          new Paragraph({ children: [new TextRun({ text: 'Budget → Category Breakdown', bold: true, size: 24 })], spacing: { after: 200 } }),
          new Table({ rows: breakdownRows, width: { size: 9000, type: WidthType.DXA } }),
        ],
      }],
    });

    return Packer.toBuffer(doc);
  }
}

