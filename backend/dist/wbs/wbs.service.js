"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WbsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const wbs_budget_entity_1 = require("./wbs-budget.entity");
const live_expense_entity_1 = require("./live-expense.entity");
let WbsService = class WbsService {
    constructor(wbsRepository, expenseRepository) {
        this.wbsRepository = wbsRepository;
        this.expenseRepository = expenseRepository;
    }
    async createWbsBudgetDraft(createWbsDto) {
        const existingWbs = await this.wbsRepository.findOne({
            where: { wbs_code: createWbsDto.wbs_code },
        });
        if (existingWbs) {
            throw new common_1.ConflictException(`WBS Code '${createWbsDto.wbs_code}' already exists.`);
        }
        const newWbsDraft = this.wbsRepository.create({
            ...createWbsDto,
            is_approved: false,
        });
        return this.wbsRepository.save(newWbsDraft);
    }
    async logLiveExpenseEntry(expenseDto, userId) {
        const wbsBudget = await this.wbsRepository.findOne({ where: { wbs_id: expenseDto.wbs_id } });
        if (!wbsBudget) {
            throw new common_1.NotFoundException(`WBS ID ${expenseDto.wbs_id} not found in the budget.`);
        }
        const varianceResult = this.calculateLiveExpenseVariance(wbsBudget, expenseDto);
        const newExpense = this.expenseRepository.create({
            ...expenseDto,
            user_id: userId,
            variance_flag: varianceResult.flag,
        });
        return this.expenseRepository.save(newExpense);
    }
    async findAllWbsBudgetsWithRollup() {
        const clientSchema = 'client_template';
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
            FROM ${clientSchema}.live_expense le
            WHERE le.wbs_id = wb.wbs_id
          ), 0.00) AS total_paid_self
        FROM ${clientSchema}.wbs_budget wb
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
            FROM ${clientSchema}.live_expense le
            WHERE le.wbs_id = wb.wbs_id
          ), 0.00) AS total_paid_self
        FROM ${clientSchema}.wbs_budget wb
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
        CAST(wt.total_paid_self AS NUMERIC(19, 4)) AS total_paid_self
      FROM wbs_tree wt
      ORDER BY wt.wbs_code ASC;
    `;
        return this.wbsRepository.query(rawQuery);
    }
    calculateLiveExpenseVariance(wbsBudget, expenseDto) {
        const budgetedTotal = wbsBudget.total_cost_budgeted;
        const actualPaid = expenseDto.actual_paid_amount;
        const variance = Number(budgetedTotal) - Number(actualPaid);
        let flag = 'NO_VARIANCE';
        if (variance < 0) {
            flag = 'NEGATIVE_VARIANCE';
        }
        else if (variance > 0) {
            flag = 'POSITIVE_VARIANCE';
        }
        return { variance, flag };
    }
};
exports.WbsService = WbsService;
exports.WbsService = WbsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(wbs_budget_entity_1.WbsBudgetEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(live_expense_entity_1.LiveExpenseEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], WbsService);
//# sourceMappingURL=wbs.service.js.map