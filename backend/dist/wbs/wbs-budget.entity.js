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
exports.WbsBudgetEntity = void 0;
const typeorm_1 = require("typeorm");
let WbsBudgetEntity = class WbsBudgetEntity {
};
exports.WbsBudgetEntity = WbsBudgetEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WbsBudgetEntity.prototype, "wbs_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], WbsBudgetEntity.prototype, "parent_wbs_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => WbsBudgetEntity, (wbs) => wbs.children),
    (0, typeorm_1.JoinColumn)({ name: 'parent_wbs_id' }),
    __metadata("design:type", WbsBudgetEntity)
], WbsBudgetEntity.prototype, "parent", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => WbsBudgetEntity, (wbs) => wbs.parent),
    __metadata("design:type", Array)
], WbsBudgetEntity.prototype, "children", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 50 }),
    __metadata("design:type", String)
], WbsBudgetEntity.prototype, "wbs_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], WbsBudgetEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 19, scale: 4 }),
    __metadata("design:type", Number)
], WbsBudgetEntity.prototype, "unit_cost_budgeted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 19, scale: 4 }),
    __metadata("design:type", Number)
], WbsBudgetEntity.prototype, "quantity_budgeted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], WbsBudgetEntity.prototype, "duration_days_budgeted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 19, scale: 4 }),
    __metadata("design:type", Number)
], WbsBudgetEntity.prototype, "total_cost_budgeted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], WbsBudgetEntity.prototype, "is_approved", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], WbsBudgetEntity.prototype, "created_at", void 0);
exports.WbsBudgetEntity = WbsBudgetEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'wbs_budget', schema: 'client_template' })
], WbsBudgetEntity);
//# sourceMappingURL=wbs-budget.entity.js.map