import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { ClsService } from "nestjs-cls";

import { FinanceCoreService } from "./finance-core.service";
import { FiscalYearEntity } from "./entities/fiscal-year.entity";
import { FiscalPeriodEntity } from "./entities/fiscal-period.entity";
import { DepartmentEntity } from "./entities/department.entity";
import { CostCenterEntity } from "./entities/cost-center.entity";
import { AccountClassEntity } from "./entities/account-class.entity";
import { AccountGroupEntity } from "./entities/account-group.entity";
import { GLAccountEntity } from "./entities/gl-account.entity";
import { P2PRequisitionEntity } from "./entities/p2p-requisition.entity";
import { P2PPurchaseOrderEntity } from "./entities/p2p-purchase-order.entity";
import { P2PInvoiceEntity } from "./entities/p2p-invoice.entity";
import { P2PReceiptEntity } from "./entities/p2p-receipt.entity";
import { P2PPurchaseOrderLineEntity } from "./entities/p2p-purchase-order-line.entity";
import { P2PReceiptLineEntity } from "./entities/p2p-receipt-line.entity";
import { VendorEntity } from "./entities/vendor.entity";
import { BudgetLedgerEntity } from "./entities/budget-ledger.entity";
import { PayrollLineItemEntity } from "./entities/payroll-line-item.entity";
import { ApprovalLogEntity } from "../common/entities/approval-log.entity";
import { DOAService } from "../common/doa.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PdfGenerationService } from "../common/pdf-generation.service";
import { TenantService } from "../tenants/tenant.service";
import { OperationalBudgetsService } from "../operational-budgets/operational-budgets.service";
import { BudgetControlService } from "../common/budget-control.service";
import { TENANT_DATA_SOURCE } from "../database/constants";

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe("FinanceCoreService — atomic document numbering", () => {
  let service: FinanceCoreService;

  const tenantId = "tenant-1";
  const clsMock = {
    get: jest.fn((key: string) => {
      if (key === "tenant_id") return tenantId;
      if (key === "userId") return "user-1";
      return undefined;
    }),
  };

  const requisitionRepo = mockRepo();
  const approvalLogRepo = mockRepo();
  const costCenterRepo = mockRepo();
  const invoiceRepo = mockRepo();
  const vendorRepo = mockRepo();
  const poRepo = mockRepo();
  const receiptRepo = mockRepo();
  const poLineRepo = mockRepo();
  const receiptLineRepo = mockRepo();
  const operationalBudgetsService = {
    createEncumbrance: jest.fn(),
    releaseEncumbrancesForSource: jest.fn(),
    getActiveEncumbrancesForBudget: jest.fn(),
  };

  const manager = {
    query: jest.fn(),
  };
  const dataSourceMock = {
    manager,
    getRepository: jest.fn(() => ({ find: jest.fn().mockResolvedValue([]) })),
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceCoreService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: ClsService, useValue: clsMock },
        {
          provide: getRepositoryToken(FiscalYearEntity, TENANT_DATA_SOURCE),
          useValue: mockRepo(),
        },
        {
          provide: getRepositoryToken(FiscalPeriodEntity, TENANT_DATA_SOURCE),
          useValue: mockRepo(),
        },
        {
          provide: getRepositoryToken(DepartmentEntity, TENANT_DATA_SOURCE),
          useValue: mockRepo(),
        },
        {
          provide: getRepositoryToken(CostCenterEntity, TENANT_DATA_SOURCE),
          useValue: costCenterRepo,
        },
        {
          provide: getRepositoryToken(AccountClassEntity, TENANT_DATA_SOURCE),
          useValue: mockRepo(),
        },
        {
          provide: getRepositoryToken(AccountGroupEntity, TENANT_DATA_SOURCE),
          useValue: mockRepo(),
        },
        {
          provide: getRepositoryToken(GLAccountEntity, TENANT_DATA_SOURCE),
          useValue: mockRepo(),
        },
        {
          provide: getRepositoryToken(P2PRequisitionEntity, TENANT_DATA_SOURCE),
          useValue: requisitionRepo,
        },
        {
          provide: getRepositoryToken(
            P2PPurchaseOrderEntity,
            TENANT_DATA_SOURCE,
          ),
          useValue: poRepo,
        },
        {
          provide: getRepositoryToken(P2PInvoiceEntity, TENANT_DATA_SOURCE),
          useValue: invoiceRepo,
        },
        {
          provide: getRepositoryToken(P2PReceiptEntity, TENANT_DATA_SOURCE),
          useValue: receiptRepo,
        },
        {
          provide: getRepositoryToken(
            P2PPurchaseOrderLineEntity,
            TENANT_DATA_SOURCE,
          ),
          useValue: poLineRepo,
        },
        {
          provide: getRepositoryToken(
            P2PReceiptLineEntity,
            TENANT_DATA_SOURCE,
          ),
          useValue: receiptLineRepo,
        },
        {
          provide: getRepositoryToken(BudgetLedgerEntity, TENANT_DATA_SOURCE),
          useValue: mockRepo(),
        },
        {
          provide: getRepositoryToken(
            PayrollLineItemEntity,
            TENANT_DATA_SOURCE,
          ),
          useValue: mockRepo(),
        },
        {
          provide: getRepositoryToken(ApprovalLogEntity, TENANT_DATA_SOURCE),
          useValue: approvalLogRepo,
        },
        {
          provide: getRepositoryToken(VendorEntity, TENANT_DATA_SOURCE),
          useValue: vendorRepo,
        },
        { provide: DOAService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: PdfGenerationService, useValue: {} },
        { provide: TenantService, useValue: {} },
        {
          provide: OperationalBudgetsService,
          useValue: operationalBudgetsService,
        },
        { provide: BudgetControlService, useValue: {} },
      ],
    }).compile();

    service = module.get(FinanceCoreService);
  });

  it("formats a padded, year-scoped number from the atomic counter", async () => {
    manager.query.mockResolvedValue([{ last_value: 7 }]);
    const year = new Date().getFullYear();

    const number = await (service as any).nextDocumentNumber(
      manager,
      tenantId,
      "REQUISITION",
      "REQ",
    );

    expect(number).toBe(`REQ-${year}-0007`);
    expect(manager.query).toHaveBeenCalledTimes(1);
    const [sql, params] = manager.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO "document_sequence"');
    expect(sql).toContain("ON CONFLICT");
    expect(sql).toContain("RETURNING");
    expect(params).toEqual([tenantId, "REQUISITION", year]);
  });

  it("coerces string sequence values returned by the driver", async () => {
    manager.query.mockResolvedValue([{ last_value: "12" }]);
    const year = new Date().getFullYear();

    const number = await (service as any).nextDocumentNumber(
      manager,
      tenantId,
      "PURCHASE_ORDER",
      "PO",
    );

    expect(number).toBe(`PO-${year}-0012`);
  });

  it("uses the atomic sequence for requisitions instead of count()+1", async () => {
    jest
      .spyOn(service as any, "nextDocumentNumber")
      .mockResolvedValue("REQ-2026-0007");

    requisitionRepo.create.mockImplementation((x: unknown) => x);
    requisitionRepo.save.mockImplementation((x: any) =>
      Promise.resolve({ ...x, id: "req-1" }),
    );
    approvalLogRepo.create.mockReturnValue({});
    approvalLogRepo.save.mockResolvedValue({});
    costCenterRepo.findOne.mockResolvedValue({ department: { id: "dept-1" } });
    operationalBudgetsService.createEncumbrance.mockResolvedValue({});

    const req = await service.createRequisition({
      description: "Valve spares",
      estimatedAmount: 1000,
      costCenterId: "cc-1",
      glAccountId: "gl-1",
      vendorName: "Vendor A",
      currency: "USD",
      exchangeRate: 1,
    } as any);

    expect((req as any).requisition_number).toBe("REQ-2026-0007");
    expect(requisitionRepo.count).not.toHaveBeenCalled();
    expect((service as any).nextDocumentNumber).toHaveBeenCalledWith(
      dataSourceMock.manager,
      tenantId,
      "REQUISITION",
      "REQ",
    );
  });

  describe("createInvoice — retention & withholding", () => {
    const baseInvoice = {
      invoiceNumber: "INV-1",
      amount: 1000,
      vendorName: "Contractor Ltd",
      invoiceDate: "2026-01-15",
      costCenterId: "cc-1",
      glAccountId: "gl-1",
    };

    beforeEach(() => {
      invoiceRepo.create.mockImplementation((x: unknown) => x);
      invoiceRepo.save.mockImplementation((x: any) =>
        Promise.resolve({ ...x, id: "inv-1" }),
      );
    });

    it("computes retention, WHT and net payable from percentages", async () => {
      const saved = await service.createInvoice({
        ...baseInvoice,
        retentionPct: 5,
        whtPct: 2.5,
      } as any);

      expect(saved.retention_amount).toBe(50);
      expect(saved.wht_amount).toBe(25);
      expect(saved.net_payable).toBe(925);
      expect(saved.retention_pct).toBe(5);
      expect(saved.wht_pct).toBe(2.5);
    });

    it("defaults both deductions to zero when omitted", async () => {
      const saved = await service.createInvoice({ ...baseInvoice } as any);

      expect(saved.retention_amount).toBe(0);
      expect(saved.wht_amount).toBe(0);
      expect(saved.net_payable).toBe(1000);
    });

    it("rejects out-of-range retention percentages", async () => {
      await expect(
        service.createInvoice({ ...baseInvoice, retentionPct: 150 } as any),
      ).rejects.toThrow(/retentionPct/);
      expect(invoiceRepo.save).not.toHaveBeenCalled();
    });

    it("rejects negative withholding percentages", async () => {
      await expect(
        service.createInvoice({ ...baseInvoice, whtPct: -1 } as any),
      ).rejects.toThrow(/whtPct/);
    });
  });

  describe("vendor master", () => {
    beforeEach(() => {
      vendorRepo.create.mockImplementation((x: unknown) => x);
      vendorRepo.save.mockImplementation((x: any) =>
        Promise.resolve({ ...x, id: "ven-1" }),
      );
    });

    it("creates a tenant-scoped vendor with sensible defaults", async () => {
      vendorRepo.findOne.mockResolvedValue(null);
      const v = await service.createVendor({
        code: "V-1",
        name: "Acme",
      } as any);

      expect(v.code).toBe("V-1");
      expect(v.tenant_id).toBe(tenantId);
      expect(v.status).toBe("ACTIVE");
      expect(v.payment_terms_days).toBe(30);
      expect(v.currency).toBe("USD");
    });

    it("rejects a duplicate vendor code", async () => {
      vendorRepo.findOne.mockResolvedValue({ id: "existing" });

      await expect(
        service.createVendor({ code: "V-1", name: "Acme" } as any),
      ).rejects.toThrow(/already exists/);
      expect(vendorRepo.save).not.toHaveBeenCalled();
    });

    it("applies partial updates", async () => {
      vendorRepo.findOne.mockResolvedValue({
        id: "ven-1",
        tenant_id: tenantId,
        name: "Old",
        status: "ACTIVE",
        payment_terms_days: 30,
      });

      const v = await service.updateVendor("ven-1", {
        name: "New",
        paymentTermsDays: 45,
      } as any);

      expect(v.name).toBe("New");
      expect(v.payment_terms_days).toBe(45);
    });

    it("throws when the vendor is missing", async () => {
      vendorRepo.findOne.mockResolvedValue(null);
      await expect(service.getVendor("missing")).rejects.toThrow(/not found/);
    });
  });

  describe("vendor linkage on requisitions", () => {
    beforeEach(() => {
      requisitionRepo.create.mockImplementation((x: unknown) => x);
      requisitionRepo.save.mockImplementation((x: any) =>
        Promise.resolve({ ...x, id: "req-1" }),
      );
      approvalLogRepo.create.mockReturnValue({});
      approvalLogRepo.save.mockResolvedValue({});
      costCenterRepo.findOne.mockResolvedValue({
        department: { id: "dept-1" },
      });
      operationalBudgetsService.createEncumbrance.mockResolvedValue({});
      jest
        .spyOn(service as any, "nextDocumentNumber")
        .mockResolvedValue("REQ-2026-0009");
    });

    it("snapshots the vendor name and sets the vendor id", async () => {
      vendorRepo.findOne.mockResolvedValue({
        id: "ven-1",
        name: "Acme Supplies",
        status: "ACTIVE",
      });

      const req = await service.createRequisition({
        description: "x",
        estimatedAmount: 100,
        costCenterId: "cc-1",
        glAccountId: "gl-1",
        vendorId: "ven-1",
      } as any);

      expect(req.vendor_id).toBe("ven-1");
      expect(req.vendor_name).toBe("Acme Supplies");
    });

    it("refuses an inactive vendor", async () => {
      vendorRepo.findOne.mockResolvedValue({
        id: "ven-1",
        name: "Acme",
        status: "INACTIVE",
      });

      await expect(
        service.createRequisition({
          description: "x",
          estimatedAmount: 100,
          costCenterId: "cc-1",
          glAccountId: "gl-1",
          vendorId: "ven-1",
        } as any),
      ).rejects.toThrow(/cannot be used/);
      expect(requisitionRepo.save).not.toHaveBeenCalled();
    });

    it("falls back to free-text vendor name with a null id", async () => {
      const req = await service.createRequisition({
        description: "x",
        estimatedAmount: 100,
        costCenterId: "cc-1",
        glAccountId: "gl-1",
        vendorName: "Walk-in",
      } as any);

      expect(req.vendor_id).toBeNull();
      expect(req.vendor_name).toBe("Walk-in");
      expect(vendorRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe("line-level goods receipt (GRN)", () => {
    beforeEach(() => {
      dataSourceMock.transaction.mockReset();
    });

    const buildTxManager = (
      requisition?: Record<string, unknown> | null,
    ) => {
      const txManager = {
        findOne: jest.fn(
          async (entity: unknown) =>
            entity === P2PRequisitionEntity ? requisition ?? null : null,
        ),
        create: jest.fn((_entity: unknown, obj: Record<string, unknown>) => ({
          ...obj,
        })),
        save: jest.fn(async (x: any) =>
          Array.isArray(x)
            ? x.map((row, i) => ({ ...row, id: `pol-${i + 1}` }))
            : { ...x, id: x.id ?? "gen-1" },
        ),
        createQueryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: "0" }),
        })),
        query: jest.fn(),
      };
      return txManager;
    };

    it("synthesizes a single PO line from the requisition", async () => {
      const requisition = {
        id: "req-1",
        tenant_id: tenantId,
        status: "PENDING_APPROVAL",
        estimated_amount: 1000,
        currency: "USD",
        exchange_rate: 1,
        base_amount: 1000,
        gl_account_id: "gl-1",
        cost_center_id: "cc-1",
        description: "Valve spares",
        vendor_id: null,
        vendor_name: null,
        costCenter: null,
      };
      const txManager = buildTxManager(requisition);
      dataSourceMock.transaction.mockImplementation(async (cb: any) =>
        cb(txManager),
      );
      jest
        .spyOn(service as any, "nextDocumentNumber")
        .mockResolvedValue("PO-2026-0001");
      (service as any).doaService = { validateAuthority: jest.fn() };

      const po = await service.createPurchaseOrder("req-1", {
        id: "u1",
      } as any);

      const lineCall = txManager.save.mock.calls.find(([arg]) =>
        Array.isArray(arg),
      );
      expect(lineCall).toBeTruthy();
      const savedLines = lineCall![0] as any[];
      expect(savedLines).toHaveLength(1);
      expect(savedLines[0].description).toBe("Valve spares");
      expect(savedLines[0].line_number).toBe(1);
      expect(savedLines[0].quantity).toBe(1);
      expect(savedLines[0].unit_amount).toBe(1000);
      expect(savedLines[0].line_amount).toBe(1000);
      expect(savedLines[0].gl_account_id).toBe("gl-1");
      expect(po.committed_amount).toBe(1000);
    });

    it("uses explicit lines and sums the committed amount", async () => {
      const requisition = {
        id: "req-1",
        tenant_id: tenantId,
        status: "PENDING_APPROVAL",
        estimated_amount: 250,
        currency: "USD",
        exchange_rate: 1,
        base_amount: null,
        gl_account_id: "gl-1",
        cost_center_id: "cc-1",
        description: "Bundle",
        vendor_id: null,
        vendor_name: null,
        costCenter: null,
      };
      const txManager = buildTxManager(requisition);
      dataSourceMock.transaction.mockImplementation(async (cb: any) =>
        cb(txManager),
      );
      jest
        .spyOn(service as any, "nextDocumentNumber")
        .mockResolvedValue("PO-2026-0002");
      (service as any).doaService = { validateAuthority: jest.fn() };

      const po = await service.createPurchaseOrder(
        "req-1",
        { id: "u1" } as any,
        [
          { description: "Widget", quantity: 2, unitAmount: 100 },
          { description: "Fitting", quantity: 1, unitAmount: 50 },
        ],
      );

      const lineCall = txManager.save.mock.calls.find(([arg]) =>
        Array.isArray(arg),
      );
      const savedLines = lineCall![0] as any[];
      expect(savedLines).toHaveLength(2);
      expect(savedLines[1].line_number).toBe(2);
      expect(savedLines[1].line_amount).toBe(50);
      expect(po.committed_amount).toBe(250);
    });

    it("rejects explicit lines that exceed the approved requisition amount", async () => {
      const requisition = {
        id: "req-1",
        tenant_id: tenantId,
        status: "PENDING_APPROVAL",
        estimated_amount: 100,
        currency: "USD",
        exchange_rate: 1,
        base_amount: 100,
        gl_account_id: "gl-1",
        cost_center_id: "cc-1",
        description: "Small",
        vendor_id: null,
        vendor_name: null,
        costCenter: null,
      };
      const txManager = buildTxManager(requisition);
      dataSourceMock.transaction.mockImplementation(async (cb: any) =>
        cb(txManager),
      );
      jest
        .spyOn(service as any, "nextDocumentNumber")
        .mockResolvedValue("PO-2026-0003");
      (service as any).doaService = { validateAuthority: jest.fn() };

      await expect(
        service.createPurchaseOrder("req-1", { id: "u1" } as any, [
          { description: "Big", quantity: 1, unitAmount: 500 },
        ]),
      ).rejects.toThrow(/exceeds the approved requisition amount/);
    });

    it("creates receipt lines and rolls received quantity onto the PO line", async () => {
      poRepo.findOne.mockResolvedValue({
        id: "po-1",
        tenant_id: tenantId,
        po_number: "PO-1",
        status: "ISSUED",
        committed_amount: 1000,
      });
      poLineRepo.find.mockResolvedValue([
        {
          id: "pol-1",
          line_number: 1,
          quantity: 10,
          unit_amount: 100,
          received_quantity: 0,
        },
      ]);
      const txManager = buildTxManager();
      dataSourceMock.transaction.mockImplementation(async (cb: any) =>
        cb(txManager),
      );

      const saved = await service.recordReceipt({
        purchaseOrderId: "po-1",
        receivedByUserId: "u1",
        receivedDate: "2026-02-01",
        lines: [{ purchaseOrderLineId: "pol-1", quantity: 4 }],
      });

      expect(saved.id).toBe("gen-1");
      const receiptLineCall = txManager.save.mock.calls.find(([arg]) =>
        Array.isArray(arg),
      );
      const receiptLines = receiptLineCall![0] as any[];
      expect(receiptLines).toHaveLength(1);
      expect(receiptLines[0].quantity).toBe(4);
      expect(receiptLines[0].unit_amount).toBe(100);
      expect(receiptLines[0].line_amount).toBe(400);

      const poLineSave = txManager.save.mock.calls
        .map(([arg]) => arg)
        .filter((arg) => !Array.isArray(arg))
        .find((arg: any) => arg.id === "pol-1");
      expect(poLineSave.received_quantity).toBe(4);
    });

    it("rejects over-receipt against the ordered line quantity", async () => {
      poRepo.findOne.mockResolvedValue({
        id: "po-1",
        tenant_id: tenantId,
        po_number: "PO-1",
        status: "PARTIALLY_FULFILLED",
        committed_amount: 1000,
      });
      poLineRepo.find.mockResolvedValue([
        {
          id: "pol-1",
          line_number: 1,
          quantity: 10,
          unit_amount: 100,
          received_quantity: 8,
        },
      ]);

      await expect(
        service.recordReceipt({
          purchaseOrderId: "po-1",
          receivedByUserId: "u1",
          receivedDate: "2026-02-01",
          lines: [{ purchaseOrderLineId: "pol-1", quantity: 3 }],
        }),
      ).rejects.toThrow(/Over-receipt/);
      expect(dataSourceMock.transaction).not.toHaveBeenCalled();
    });

    it("returns per-line statuses from the three-way match", async () => {
      poRepo.findOne.mockResolvedValue({
        id: "po-1",
        tenant_id: tenantId,
        po_number: "PO-1",
        committed_amount: 1000,
        requisition: { cost_center_id: null },
        invoices: [],
        lines: [
          {
            id: "pol-1",
            line_number: 1,
            description: "A",
            quantity: 10,
            unit_amount: 100,
            line_amount: 1000,
            received_quantity: 10,
          },
        ],
        receipts: [
          {
            id: "rcp-1",
            amount: 1000,
            lines: [{ purchase_order_line_id: "pol-1", quantity: 10 }],
          },
        ],
      });

      const result = await service.getThreeWayMatch("po-1", tenantId);

      expect(result.lines).toHaveLength(1);
      expect(result.lines![0]).toMatchObject({
        lineNumber: 1,
        orderedQty: 10,
        receivedQty: 10,
        receivedAmount: 1000,
        status: "MATCHED",
      });
    });
  });

  describe("multi-currency receipts & three-way match", () => {
    beforeEach(() => {
      dataSourceMock.transaction.mockReset();
    });

    const buildTxManager = () => ({
      findOne: jest.fn(async () => null),
      create: jest.fn((_entity: unknown, obj: Record<string, unknown>) => ({
        ...obj,
      })),
      save: jest.fn(async (x: any) =>
        Array.isArray(x) ? x : { ...x, id: x.id ?? "gen-1" },
      ),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: "0" }),
      })),
      query: jest.fn(),
    });

    it("inherits the PO currency/rate and normalises receipt base amount", async () => {
      poRepo.findOne.mockResolvedValue({
        id: "po-1",
        tenant_id: tenantId,
        po_number: "PO-1",
        status: "ISSUED",
        committed_amount: 1000,
        currency: "EUR",
        exchange_rate: 1.1,
      });
      poLineRepo.find.mockResolvedValue([
        {
          id: "pol-1",
          line_number: 1,
          quantity: 10,
          unit_amount: 100,
          received_quantity: 0,
        },
      ]);
      const txManager = buildTxManager();
      dataSourceMock.transaction.mockImplementation(async (cb: any) =>
        cb(txManager),
      );

      await service.recordReceipt({
        purchaseOrderId: "po-1",
        receivedByUserId: "u1",
        receivedDate: "2026-03-01",
        lines: [{ purchaseOrderLineId: "pol-1", quantity: 2 }],
      });

      const receiptArg = txManager.save.mock.calls[0][0] as any;
      expect(receiptArg.currency).toBe("EUR");
      expect(receiptArg.exchange_rate).toBe(1.1);
      expect(receiptArg.amount).toBe(200);
      expect(receiptArg.base_amount).toBe(220);
    });

    it("honours an explicit currency override on the receipt", async () => {
      poRepo.findOne.mockResolvedValue({
        id: "po-1",
        tenant_id: tenantId,
        po_number: "PO-1",
        status: "ISSUED",
        committed_amount: 1000,
        currency: "EUR",
        exchange_rate: 1.1,
      });
      poLineRepo.find.mockResolvedValue([
        {
          id: "pol-1",
          line_number: 1,
          quantity: 10,
          unit_amount: 100,
          received_quantity: 0,
        },
      ]);
      const txManager = buildTxManager();
      dataSourceMock.transaction.mockImplementation(async (cb: any) =>
        cb(txManager),
      );

      await service.recordReceipt({
        purchaseOrderId: "po-1",
        receivedByUserId: "u1",
        receivedDate: "2026-03-01",
        currency: "gbp",
        exchangeRate: 1.25,
        lines: [{ purchaseOrderLineId: "pol-1", quantity: 2 }],
      });

      const receiptArg = txManager.save.mock.calls[0][0] as any;
      expect(receiptArg.currency).toBe("GBP");
      expect(receiptArg.exchange_rate).toBe(1.25);
      expect(receiptArg.base_amount).toBe(250);
    });

    it("rejects a non-positive exchange rate", async () => {
      poRepo.findOne.mockResolvedValue({
        id: "po-1",
        tenant_id: tenantId,
        po_number: "PO-1",
        status: "ISSUED",
        committed_amount: 1000,
        currency: "EUR",
        exchange_rate: 1.1,
      });
      poLineRepo.find.mockResolvedValue([
        {
          id: "pol-1",
          line_number: 1,
          quantity: 10,
          unit_amount: 100,
          received_quantity: 0,
        },
      ]);

      await expect(
        service.recordReceipt({
          purchaseOrderId: "po-1",
          receivedByUserId: "u1",
          receivedDate: "2026-03-01",
          exchangeRate: 0,
          lines: [{ purchaseOrderLineId: "pol-1", quantity: 1 }],
        }),
      ).rejects.toThrow(/exchangeRate/);
    });

    it("reconciles mixed-currency documents in base currency", async () => {
      poRepo.findOne.mockResolvedValue({
        id: "po-1",
        tenant_id: tenantId,
        po_number: "PO-1",
        currency: "EUR",
        exchange_rate: 1.1,
        committed_amount: 1000,
        committed_base_amount: 1100,
        requisition: { cost_center_id: null },
        lines: [],
        receipts: [
          {
            id: "rcp-1",
            amount: 1000,
            currency: "EUR",
            exchange_rate: 1.1,
            base_amount: 1100,
          },
        ],
        invoices: [
          {
            status: "PAID",
            amount: 1000,
            currency: "EUR",
            exchange_rate: 1.1,
            base_amount: 1100,
          },
        ],
      });

      const result = await service.getThreeWayMatch("po-1", tenantId);

      expect(result.currency).toBe("EUR");
      expect(result.poAmount).toBe(1100);
      expect(result.receivedAmount).toBe(1100);
      expect(result.invoicedAmount).toBe(1100);
      expect(result.variance).toBe(0);
      expect(result.status).toBe("MATCHED");
    });

    it("flags a base-currency over-billing as MISMATCH", async () => {
      poRepo.findOne.mockResolvedValue({
        id: "po-1",
        tenant_id: tenantId,
        po_number: "PO-1",
        currency: "EUR",
        exchange_rate: 1.1,
        committed_amount: 1000,
        committed_base_amount: 1100,
        requisition: { cost_center_id: null },
        lines: [],
        receipts: [],
        invoices: [
          {
            status: "RECEIVED",
            amount: 1300,
            currency: "USD",
            exchange_rate: 1,
            base_amount: 1300,
          },
        ],
      });

      const result = await service.getThreeWayMatch("po-1", tenantId);

      expect(result.invoicedAmount).toBe(1300);
      expect(result.variance).toBe(200);
      expect(result.status).toBe("MISMATCH");
    });
  });
});
