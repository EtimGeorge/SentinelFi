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
  static async generateProjectReport(
    projects: (ProjectEntity & {
      total_budgeted_rollup: number;
      total_paid_rollup: number;
    })[],
    title: string = "Project Portfolio Report",
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
                new Paragraph(formatCurrency(project.total_budgeted_rollup)),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph(formatCurrency(project.total_paid_rollup)),
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
              children: [new TextRun({ text: title, bold: true, size: 32 })],
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
    title: string = "WBS Budget Report",
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
                new Paragraph(formatCurrency(budget.total_cost_budgeted)),
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
              children: [new TextRun({ text: title, bold: true, size: 32 })],
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
    title: string = "Live Expense Report",
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
              children: [new Paragraph(formatCurrency(expense.amount))],
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
              children: [new TextRun({ text: title, bold: true, size: 32 })],
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
    title: string = "Operational Budget Report",
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
              children: [new Paragraph(formatCurrency(budget.budgeted_amount))],
            }),
            new TableCell({
              children: [new Paragraph(formatCurrency(budget.actual_spent))],
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
              children: [new TextRun({ text: title, bold: true, size: 32 })],
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
}
