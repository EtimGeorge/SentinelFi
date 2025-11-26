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
exports.CreateWbsBudgetDto = void 0;
const class_validator_1 = require("class-validator");
class CreateWbsBudgetDto {
}
exports.CreateWbsBudgetDto = CreateWbsBudgetDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)("4", {
        message: "Parent WBS ID must be a valid UUID v4 or null for the root.",
    }),
    __metadata("design:type", Object)
], CreateWbsBudgetDto.prototype, "parent_wbs_id", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateWbsBudgetDto.prototype, "wbs_code", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWbsBudgetDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 4 }),
    (0, class_validator_1.Min)(0, { message: "Unit cost must be a non-negative number." }),
    __metadata("design:type", Number)
], CreateWbsBudgetDto.prototype, "unit_cost_budgeted", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 4 }),
    (0, class_validator_1.Min)(0.01, { message: "Quantity must be greater than zero." }),
    __metadata("design:type", Number)
], CreateWbsBudgetDto.prototype, "quantity_budgeted", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0, { message: "Duration must be a non-negative number." }),
    __metadata("design:type", Object)
], CreateWbsBudgetDto.prototype, "duration_days_budgeted", void 0);
//# sourceMappingURL=create-wbs-budget.dto.js.map