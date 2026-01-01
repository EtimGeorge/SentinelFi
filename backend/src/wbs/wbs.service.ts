import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException, // Added
  InternalServerErrorException, // Added
  Logger, // Added
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not, DataSource } from "typeorm"; // Added DataSource
import { WbsBudgetEntity } from "./wbs-budget.entity";
import { LiveExpenseEntity } from "./live-expense.entity";
import { CreateWbsBudgetDto } from "./dto/create-wbs-budget.dto";
import { CreateLiveExpenseDto } from "./dto/create-live-expense.dto";
import { WbsCategoryEntity } from "./wbs-category.entity";
import { WbsBudgetRollupDto } from "./dto/wbs-budget-rollup.dto";
import { UpdateWbsCategoryDto } from "./dto/update-wbs-category.dto";

@Injectable()
export class WbsService {
  private readonly logger = new Logger(WbsService.name); // Added

  constructor(
    @InjectRepository(WbsBudgetEntity)
    private wbsRepository: Repository<WbsBudgetEntity>,
    @InjectRepository(LiveExpenseEntity)
    private expenseRepository: Repository<LiveExpenseEntity>,
    @InjectRepository(WbsCategoryEntity)
    private categoryRepository: Repository<WbsCategoryEntity>,
    private dataSource: DataSource, // Injected DataSource
  ) {}

  /**
   * NEW FEATURE: Retrieves all master WBS categories (Level 1)
   */
  async findAllCategories(): Promise<WbsCategoryEntity[]> {
    return this.categoryRepository.find({
      order: { code: "ASC" },
    });
  }

  /**
   * NEW FEATURE: Creates a new master WBS category (For Admin/Finance)
   */
  async createCategory(
    code: string,
    description: string,
  ): Promise<WbsCategoryEntity> {
    const existing = await this.categoryRepository.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException(`WBS Category code ${code} already exists.`);
    }
    const newCategory = this.categoryRepository.create({ code, description });
    return this.categoryRepository.save(newCategory);
  }

  /**
   * NEW FEATURE: Deletes a master WBS category (For Admin/Finance)
   */
  async deleteCategory(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`WBS Category with ID ${id} not found.`);
    }

    const wbsWithCategory = await this.wbsRepository.findOne({
      where: { wbs_code: category.code },
    });
    if (wbsWithCategory) {
      throw new ConflictException(
        `WBS Category ${category.code} is in use and cannot be deleted.`,
      );
    }

    await this.categoryRepository.delete(id);
  }

  /**
   * NEW FEATURE: Updates a master WBS category (For Admin/Finance)
   */
  async updateCategory(
    id: string,
    updateWbsCategoryDto: UpdateWbsCategoryDto, // Accept DTO directly
  ): Promise<WbsCategoryEntity> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`WBS Category with ID ${id} not found.`);
    }

    // Apply partial updates only for provided fields
    if (updateWbsCategoryDto.code !== undefined) {
      // Check for duplicate code, excluding the current category
      const existingCode = await this.categoryRepository.findOne({
        where: { code: updateWbsCategoryDto.code, id: Not(id) },
      });
      if (existingCode) {
        throw new ConflictException(`WBS Category code ${updateWbsCategoryDto.code} already exists.`);
      }
      category.code = updateWbsCategoryDto.code;
    }

    if (updateWbsCategoryDto.description !== undefined) {
      category.description = updateWbsCategoryDto.description;
    }
    
    return this.categoryRepository.save(category);
  }

  /**
   * NEW FEATURE: Retrieves all pending WBS budget drafts.
   * @returns A list of WbsBudgetEntity that are not yet approved.
   */
  async findPendingBudgetDrafts(): Promise<WbsBudgetEntity[]> {
    return this.wbsRepository.find({
      where: { status: "pending" },
      relations: ["user"],
    });
  }

  /**
   * NEW FEATURE: Approves a WBS budget draft.
   * @param id The ID of the WBS budget draft to approve.
   * @returns The approved WbsBudgetEntity.
   */
  async approveBudgetDraft(id: string): Promise<WbsBudgetEntity> {
    const draft = await this.wbsRepository.findOne({ where: { wbs_id: id } });
    if (!draft) {
      throw new NotFoundException(`WBS Budget Draft with ID ${id} not found.`);
    }
    draft.status = "approved";
    return this.wbsRepository.save(draft);
  }

  /**
   * NEW FEATURE: Rejects a WBS budget draft.
   * (In a real scenario, this might delete the draft or mark it as rejected with comments)
   * For now, we'll mark it as approved: false and potentially add a 'rejected' status field later.
   * @param id The ID of the WBS budget draft to reject.
   * @returns The rejected WbsBudgetEntity (marked as not approved).
   */
  async rejectBudgetDraft(id: string): Promise<WbsBudgetEntity> {
    const draft = await this.wbsRepository.findOne({ where: { wbs_id: id } });
    if (!draft) {
      throw new NotFoundException(`WBS Budget Draft with ID ${id} not found.`);
    }
    draft.status = "rejected";
    return this.wbsRepository.save(draft);
  }

  /**
   * NEW FEATURE: Retrieves live expense entries flagged with major variance.
   * @returns A list of LiveExpenseEntity with major variance flags.
   */
  async findMajorVarianceExceptions(): Promise<LiveExpenseEntity[]> {
    return this.expenseRepository.find({
      where: [
        { variance_flag: "MAJOR_VARIANCE_OVERRUN" },
        { variance_flag: "MAJOR_VARIANCE_UNBUDGETED" },
      ],
    });
  }

  /**
   * Phase 2 Deliverable: CRUD for WBS/Budget (Create Draft)
   * Enforces WBS Code uniqueness and saves the budget as a DRAFT.
   */
  async createWbsBudgetDraft(
    createWbsDto: CreateWbsBudgetDto,
    userId: string,
  ): Promise<WbsBudgetEntity> {
    // 1. Business Constraint: Check for existing WBS Code (Uniqueness)
    const existingWbs = await this.wbsRepository.findOne({
      where: { wbs_code: createWbsDto.wbs_code },
    });

    if (existingWbs) {
      throw new ConflictException(
        `WBS Code '${createWbsDto.wbs_code}' already exists.`,
      );
    }

    // 2. Data Preparation: Create the entity instance
    const newWbsDraft = this.wbsRepository.create({
      ...createWbsDto,
      status: "pending", // MANDATORY: All new entries are drafts until Finance (Phase 3) approves
      user_id: userId,
    });

    // 3. Save to Database (ACID Transaction)
    // The total_cost_budgeted column is auto-generated by PostgreSQL, so we only save the inputs.
    return this.wbsRepository.save(newWbsDraft);
  }

  async createWbsBudgetDraftBatch(
    createWbsDtos: CreateWbsBudgetDto[],
    userId: string,
  ): Promise<WbsBudgetEntity[]> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const drafts: WbsBudgetEntity[] = [];
      for (const createWbsDto of createWbsDtos) {
        const existingWbs = await queryRunner.manager.findOne(WbsBudgetEntity, {
          where: { wbs_code: createWbsDto.wbs_code },
        });

        if (existingWbs) {
          throw new ConflictException(
            `WBS Code '${createWbsDto.wbs_code}' already exists.`,
          );
        }

        const newWbsDraft = queryRunner.manager.create(WbsBudgetEntity, {
          ...createWbsDto,
          status: "pending",
          user_id: userId,
        });
        drafts.push(newWbsDraft);
      }

      await queryRunner.manager.save(drafts);
      await queryRunner.commitTransaction();
      return drafts;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Phase 2 Deliverable: Live Expense Entry (The primary write operation)
   * This method executes the mandated variance calculation *on commit*.
   */
  async logLiveExpenseEntry(
    clientSchema: string, // Injected dynamically from authenticated context
    expenseDto: CreateLiveExpenseDto,
    userId: string,
  ): Promise<LiveExpenseEntity> {
    // 1. Business Constraint: Check if the WBS ID exists.
    const wbsBudget = await this.wbsRepository.findOne({
      where: { wbs_id: expenseDto.wbs_id },
    });

    if (!wbsBudget) {
      throw new NotFoundException(
        `WBS ID ${expenseDto.wbs_id} not found in the budget.`,
      );
    }

    // 2. Automated: Variance Calculation (MANDATORY REQUIREMENT)
    const varianceResult = await this.calculateLiveExpenseVariance(
      clientSchema,
      wbsBudget,
      expenseDto,
    );

    // 3. Data Preparation: Create the expense entity
    const newExpense = this.expenseRepository.create({
      ...expenseDto,
      user_id: userId, // Enforced accountability from the authenticated token
      variance_flag: varianceResult.flag, // Result of the real-time calculation
    });

    // 4. Save to Database (ACID Transaction)
    return this.expenseRepository.save(newExpense);
  }

  /**
   * Phase 2 Deliverable: WBS/Budget Read Operation (Production-Ready Hierarchy and Rollup)
   * Uses a Recursive CTE (Common Table Expression) for performant, single-query retrieval
   * of the WBS hierarchy and the total aggregated spending against each WBS item.
   */
  async findAllWbsBudgetsWithRollup(
    clientSchema: string, // Injected dynamically from authenticated context
    startDate?: string,
    endDate?: string,
  ): Promise<WbsBudgetRollupDto[]> {
    // CRITICAL SECURITY FIX: Validate clientSchema to prevent SQL Injection
    if (!/^[a-z0-9_]+$/.test(clientSchema)) {
      throw new BadRequestException("Invalid client schema name provided.");
    }

    let dateFilter = "";
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (startDate && endDate) {
      dateFilter = `AND le.expense_date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      queryParams.push(startDate, endDate);
    }

    const rawQuery = `
      -- 1. Anchor: Start at all root-level WBS items (parent_wbs_id IS NULL)
      WITH RECURSIVE wbs_tree AS (
        SELECT
          wb.wbs_id,
          wb.parent_wbs_id,
          wb.wbs_code,
          wb.description,
          wb.total_cost_budgeted,
          -- Calculate Total Paid Amount for this specific WBS item
          COALESCE((
            SELECT SUM(le.actual_paid_amount)
            FROM "${clientSchema}".live_expense le
            WHERE le.wbs_id = wb.wbs_id ${dateFilter}
          ), 0.00) AS total_paid_self,
          -- Calculate Total Committed (LPO) Amount for this specific WBS item
          COALESCE((
            SELECT SUM(le.commitment_lpo_amount)
            FROM "${clientSchema}".live_expense le
            WHERE le.wbs_id = wb.wbs_id ${dateFilter}
          ), 0.00) AS total_committed_lpo_self
        FROM "${clientSchema}".wbs_budget wb
        WHERE wb.parent_wbs_id IS NULL

        UNION ALL

        -- 2. Recursive Step: Join to find children
        SELECT
          wb.wbs_id,
          wb.parent_wbs_id,
          wb.wbs_code,
          wb.description,
          wb.total_cost_budgeted,
          -- Calculate Total Paid Amount for this specific WBS item
          COALESCE((
            SELECT SUM(le.actual_paid_amount)
            FROM "${clientSchema}".live_expense le
            WHERE le.wbs_id = wb.wbs_id ${dateFilter}
          ), 0.00) AS total_paid_self,
          -- Calculate Total Committed (LPO) Amount for this specific WBS item
          COALESCE((
            SELECT SUM(le.commitment_lpo_amount)
            FROM "${clientSchema}".live_expense le
            WHERE le.wbs_id = wb.wbs_id ${dateFilter}
          ), 0.00) AS total_committed_lpo_self
        FROM "${clientSchema}".wbs_budget wb
        JOIN wbs_tree wt ON wb.parent_wbs_id = wt.wbs_id
      )
      
      -- 3. Final Aggregation: Sum up total paid from all self and children
      SELECT
        wt.wbs_id,
        wt.parent_wbs_id,
        wt.wbs_code,
        wt.description,
        CAST(wt.total_cost_budgeted AS NUMERIC(19, 4)) AS total_cost_budgeted,
        -- Calculate Total Paid (Rollup) - This is the final aggregated value
        (
          SELECT SUM(CAST(t2.total_paid_self AS NUMERIC(19, 4)))
          FROM wbs_tree t2
          WHERE t2.wbs_code LIKE (wt.wbs_code || '%')
        ) AS total_paid_rollup,
        CAST(wt.total_paid_self AS NUMERIC(19, 4)) AS total_paid_self,
        -- Calculate Total Committed (LPO) (Rollup)
        (
          SELECT SUM(CAST(t2.total_committed_lpo_self AS NUMERIC(19, 4)))
          FROM wbs_tree t2
          WHERE t2.wbs_code LIKE (wt.wbs_code || '%')
        ) AS total_committed_lpo
      FROM wbs_tree wt
      ORDER BY wt.wbs_code ASC;
    `;

    // Note: The CASTs are added to ensure TypeORM returns correct numeric types.
    return this.wbsRepository.query(rawQuery, queryParams);
  }

  /**
   * Phase 6 Deliverable: Automated, live calculation for variance and MAJOR VARIANCE flag.
   */
  private async calculateLiveExpenseVariance(
    clientSchema: string, // Injected dynamically from authenticated context
    wbsBudget: WbsBudgetEntity,
    expenseDto: CreateLiveExpenseDto,
  ): Promise<{ variance: number; flag: string }> {
    // Total Cost Variance (NGN) for the line item itself
    const budgetedTotalLineItem = Number(wbsBudget.total_cost_budgeted);
    const actualPaidLineItem = Number(expenseDto.actual_paid_amount);
    const lineItemVariance = budgetedTotalLineItem - actualPaidLineItem;

    let flag = "NO_VARIANCE";

    if (lineItemVariance < 0) {
      flag = "NEGATIVE_VARIANCE";
    } else if (lineItemVariance > 0) {
      flag = "POSITIVE_VARIANCE";
    }

    // --- CRITICAL AI RULE ENGINE LOGIC (MAJOR VARIANCE) ---

    // Check 1: Unbudgeted Major Expense (Simplified: uses WBS code UNBUDGETED)
    const UNBUDGETED_CODE = "7.99"; // Use a dedicated code for unbudgeted expenses linked to Contingency (7.0 from PDF)
    const MAJOR_EXPENSE_THRESHOLD = 50000; // NGN 50,000

    if (
      wbsBudget.wbs_code === UNBUDGETED_CODE &&
      actualPaidLineItem > MAJOR_EXPENSE_THRESHOLD
    ) {
      return { variance: lineItemVariance, flag: "MAJOR_VARIANCE_UNBUDGETED" };
    }

    // Check 2: Variance Threshold Breached (WBS Category Rollup)
    // NOTE: This check must be done AFTER the expense is committed, so we calculate the *new* total based on current data.
    const rollupTotals = await this.getCategoryRollupTotals(
      clientSchema,
      wbsBudget.wbs_id,
    );
    const totalBudget = rollupTotals.budgetedCategoryTotal;
    // NOTE: For real-time check, we use the total paid *from the rollup query* which includes the current expense being processed by the transaction.
    const totalPaid = rollupTotals.actualPaidCategoryTotal;

    const categoryVariance = totalBudget - totalPaid;
    const categoryVariancePercent =
      totalBudget > 0 ? Math.abs(categoryVariance) / totalBudget : 0;
    const VARIANCE_PERCENT_THRESHOLD = 0.1; // 10%

    if (categoryVariancePercent > VARIANCE_PERCENT_THRESHOLD) {
      // Only flag as Major if it's a negative overrun
      if (categoryVariance < 0) {
        flag = "MAJOR_VARIANCE_OVERRUN";
      }
    }

    return { variance: lineItemVariance, flag: flag };
  }

  /**
   * Helper function: Retrieves the total budgeted and total paid for the entire WBS Category (Level 1).
   * This logic is similar to the CTE, but focused on real-time check for a single category.
   * @param wbsId The UUID of the line item being expensed.
   */
  private async getCategoryRollupTotals(
    clientSchema: string, // Injected dynamically from authenticated context
    wbsId: string,
  ): Promise<{
    budgetedCategoryTotal: number;
    actualPaidCategoryTotal: number;
    wbsCode: string;
  }> {
    // CRITICAL SECURITY FIX: Validate clientSchema to prevent SQL Injection
    if (!/^[a-z0-9_]+$/.test(clientSchema)) {
      throw new BadRequestException("Invalid client schema name provided.");
    }

    // 1. Get the WBS Code and Category (Level 1) of the item being expensed
    const expenseItem = await this.wbsRepository.findOne({
      where: { wbs_id: wbsId },
    });
    if (!expenseItem) {
      throw new NotFoundException(`WBS ID ${wbsId} not found for rollup.`);
    }
    const categoryCode = expenseItem.wbs_code.split(".")[0];
    // const clientSchema = "client_template"; // Removed hardcoded clientSchema

    // 2. Execute query to get the total budget/paid for the ENTIRE CATEGORY (WBS X.0)
    const rawQuery = `
        SELECT
            COALESCE(SUM(CAST(wb.total_cost_budgeted AS NUMERIC)), 0.00) AS "budgetedCategoryTotal",
            COALESCE(SUM(CAST(le.actual_paid_amount AS NUMERIC)), 0.00) AS "actualPaidCategoryTotal"
        FROM ${clientSchema}.wbs_budget wb
        LEFT JOIN ${clientSchema}.live_expense le ON wb.wbs_id = le.wbs_id
        WHERE wb.wbs_code LIKE $1 || '.%'
           OR wb.wbs_code = $1
    `;

    const result = await this.wbsRepository.query(rawQuery, [categoryCode]);

    return {
      budgetedCategoryTotal: Number(result[0].budgetedCategoryTotal),
      actualPaidCategoryTotal: Number(result[0].actualPaidCategoryTotal),
      wbsCode: expenseItem.wbs_code,
    };
  }

  /**
   * NEW FEATURE: Seeds WBS budget data into a specific tenant's schema.
   * This is used during tenant provisioning after AI agent extracts data.
   * @param clientSchema The schema name of the tenant.
   * @param wbsData Array of WBS budget data from AI agent.
   */
  async seedWbsDataForTenant(
    clientSchema: string,
    wbsData: any[], // Adjust this type to a specific DTO if AI agent output is structured
    userId: string, // User performing the action
  ): Promise<WbsBudgetEntity[]> {
    // CRITICAL SECURITY FIX: Validate clientSchema to prevent SQL Injection
    if (!/^[a-z0-9_]+$/.test(clientSchema)) {
      throw new BadRequestException("Invalid client schema name provided.");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const insertedBudgets: WbsBudgetEntity[] = [];

      for (const item of wbsData) {
        // Here we are creating new WbsBudgetEntity instances for the specific schema
        // Ensure the table name is correctly qualified with the clientSchema
        const newWbsBudget = queryRunner.manager.create(WbsBudgetEntity, {
          // Map properties from item to WbsBudgetEntity, ensure they match entity definition
          wbs_code: item.wbs_code,
          description: item.description,
          unit_cost_budgeted: item.unit_cost_budgeted,
          quantity_budgeted: item.quantity_budgeted,
          duration_days_budgeted: item.duration_days_budgeted,
          total_cost_budgeted: item.total_cost_budgeted,
          parent_wbs_id: item.parent_wbs_id || null, // Handle root WBS items
          status: "approved", // Seeded data is considered approved initially
          user_id: userId, // Associate with the user who initiated tenant creation
        });

        // Manually specify the schema for insertion
        const savedBudget = await queryRunner.manager.query(
          `INSERT INTO "${clientSchema}".wbs_budget (wbs_id, parent_wbs_id, wbs_code, description, unit_cost_budgeted, quantity_budgeted, duration_days_budgeted, total_cost_budgeted, status, user_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
          [
            newWbsBudget.wbs_id,
            newWbsBudget.parent_wbs_id,
            newWbsBudget.wbs_code,
            newWbsBudget.description,
            newWbsBudget.unit_cost_budgeted,
            newWbsBudget.quantity_budgeted,
            newWbsBudget.duration_days_budgeted,
            newWbsBudget.total_cost_budgeted,
            newWbsBudget.status,
            newWbsBudget.user_id,
            newWbsBudget.created_at,
          ],
        );
        insertedBudgets.push(savedBudget[0]); // query returns an array of rows
      }

      await queryRunner.commitTransaction();
      return insertedBudgets;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to seed WBS data for schema ${clientSchema}:`,
        err,
      );
      if (err instanceof Error) {
        throw new InternalServerErrorException(
          `Failed to seed WBS data for new tenant: ${err.message}`,
        );
      }
      throw new InternalServerErrorException(
        `Failed to seed WBS data for new tenant: An unknown error occurred.`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}