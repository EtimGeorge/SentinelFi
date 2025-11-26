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
exports.CreateLiveExpenseDto = void 0;
const class_validator_1 = require("class-validator");
class CreateLiveExpenseDto {
}
exports.CreateLiveExpenseDto = CreateLiveExpenseDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsUUID)("4", {
        message: "WBS ID must be a valid UUID v4 and link to an existing budget line.",
    }),
    __metadata("design:type", String)
], CreateLiveExpenseDto.prototype, "wbs_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Date)
], CreateLiveExpenseDto.prototype, "expense_date", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLiveExpenseDto.prototype, "item_description", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 4 }),
    (0, class_validator_1.Min)(0, { message: "Actual unit cost must be a non-negative number." }),
    __metadata("design:type", Number)
], CreateLiveExpenseDto.prototype, "actual_unit_cost", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 4 }),
    (0, class_validator_1.Min)(0.01, { message: "Actual quantity must be greater than zero." }),
    __metadata("design:type", Number)
], CreateLiveExpenseDto.prototype, "actual_quantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 4 }),
    (0, class_validator_1.Min)(0, { message: "Commitment/LPO amount must be non-negative." }),
    __metadata("design:type", Number)
], CreateLiveExpenseDto.prototype, "commitment_lpo_amount", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 4 }),
    (0, class_validator_1.Min)(0, { message: "Actual paid amount must be a non-negative number." }),
    __metadata("design:type", Number)
], CreateLiveExpenseDto.prototype, "actual_paid_amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateLiveExpenseDto.prototype, "document_reference", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLiveExpenseDto.prototype, "notes_justification", void 0);
//# sourceMappingURL=create-live-expense.dto.js.map