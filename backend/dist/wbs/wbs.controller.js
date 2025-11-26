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
exports.WbsController = void 0;
const common_1 = require("@nestjs/common");
const wbs_service_1 = require("./wbs.service");
const create_wbs_budget_dto_1 = require("./dto/create-wbs-budget.dto");
const create_live_expense_dto_1 = require("./dto/create-live-expense.dto");
let WbsController = class WbsController {
    constructor(wbsService) {
        this.wbsService = wbsService;
    }
    async createDraft(createWbsDto) {
        return this.wbsService.createWbsBudgetDraft(createWbsDto);
    }
    async logLiveExpense(expenseDto) {
        const placeholderUserId = 'TEST_USER_UUID_001';
        return this.wbsService.logLiveExpenseEntry(expenseDto, placeholderUserId);
    }
    async getAllWbsWithRollup() {
        return this.wbsService.findAllWbsBudgetsWithRollup();
    }
};
exports.WbsController = WbsController;
__decorate([
    (0, common_1.Post)('budget-draft'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_wbs_budget_dto_1.CreateWbsBudgetDto]),
    __metadata("design:returntype", Promise)
], WbsController.prototype, "createDraft", null);
__decorate([
    (0, common_1.Post)('expense/live-entry'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_live_expense_dto_1.CreateLiveExpenseDto]),
    __metadata("design:returntype", Promise)
], WbsController.prototype, "logLiveExpense", null);
__decorate([
    (0, common_1.Get)('budget/rollup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WbsController.prototype, "getAllWbsWithRollup", null);
exports.WbsController = WbsController = __decorate([
    (0, common_1.Controller)('wbs'),
    __metadata("design:paramtypes", [wbs_service_1.WbsService])
], WbsController);
//# sourceMappingURL=wbs.controller.js.map