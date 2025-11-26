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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveExpenseEntity = void 0;
const typeorm_1 = require("typeorm");
const wbs_budget_entity_1 = require("./wbs-budget.entity");
let LiveExpenseEntity = class LiveExpenseEntity {
};
exports.LiveExpenseEntity = LiveExpenseEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment'),
    __metadata("design:type", Number)
], LiveExpenseEntity.prototype, "expense_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], LiveExpenseEntity.prototype, "wbs_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => wbs_budget_entity_1.WbsBudgetEntity),
    (0, typeorm_1.JoinColumn)({ name: 'wbs_id' }),
    __metadata("design:type", wbs_budget_entity_1.WbsBudgetEntity)
], LiveExpenseEntity.prototype, "wbsBudget", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], LiveExpenseEntity.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', default: () => 'CURRENT_DATE' }),
    __metadata("design:type", Date)
], LiveExpenseEntity.prototype, "expense_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], LiveExpenseEntity.prototype, "item_description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 19, scale: 4 }),
    __metadata("design:type", Number)
], LiveExpenseEntity.prototype, "actual_unit_cost", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 19, scale: 4 }),
    __metadata("design:type", Number)
], LiveExpenseEntity.prototype, "actual_quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 19, scale: 4, default: 0.00 }),
    __metadata("design:type", Number)
], LiveExpenseEntity.prototype, "commitment_lpo_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 19, scale: 4 }),
    __metadata("design:type", Number)
], LiveExpenseEntity.prototype, "actual_paid_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], LiveExpenseEntity.prototype, "document_reference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], LiveExpenseEntity.prototype, "notes_justification", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'NO_VARIANCE' }),
    __metadata("design:type", String)
], LiveExpenseEntity.prototype, "variance_flag", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], LiveExpenseEntity.prototype, "created_at", void 0);
exports.LiveExpenseEntity = LiveExpenseEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'live_expense', schema: 'client_template' })
], LiveExpenseEntity);
//# sourceMappingURL=live-expense.entity.js.map