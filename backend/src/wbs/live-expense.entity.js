"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveExpenseEntity = void 0;
const typeorm_1 = require("typeorm");
const wbs_budget_entity_1 = require("./wbs-budget.entity");
const wbs_category_entity_1 = require("./wbs-category.entity"); // NEW: Import WbsCategoryEntity
let LiveExpenseEntity = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)({ name: "live_expense", schema: "client_template" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _tenant_id_decorators;
    let _tenant_id_initializers = [];
    let _tenant_id_extraInitializers = [];
    let _project_id_decorators;
    let _project_id_initializers = [];
    let _project_id_extraInitializers = [];
    let _wbs_id_decorators;
    let _wbs_id_initializers = [];
    let _wbs_id_extraInitializers = [];
    let _wbsBudget_decorators;
    let _wbsBudget_initializers = [];
    let _wbsBudget_extraInitializers = [];
    let _category_id_decorators;
    let _category_id_initializers = [];
    let _category_id_extraInitializers = [];
    let _category_decorators;
    let _category_initializers = [];
    let _category_extraInitializers = [];
    let _updated_at_decorators;
    let _updated_at_initializers = [];
    let _updated_at_extraInitializers = [];
    let _user_id_decorators;
    let _user_id_initializers = [];
    let _user_id_extraInitializers = [];
    let _expense_date_decorators;
    let _expense_date_initializers = [];
    let _expense_date_extraInitializers = [];
    let _description_decorators;
    let _description_initializers = [];
    let _description_extraInitializers = [];
    let _unit_cost_decorators;
    let _unit_cost_initializers = [];
    let _unit_cost_extraInitializers = [];
    let _quantity_decorators;
    let _quantity_initializers = [];
    let _quantity_extraInitializers = [];
    let _commitment_lpo_amount_decorators;
    let _commitment_lpo_amount_initializers = [];
    let _commitment_lpo_amount_extraInitializers = [];
    let _amount_decorators;
    let _amount_initializers = [];
    let _amount_extraInitializers = [];
    let _document_reference_decorators;
    let _document_reference_initializers = [];
    let _document_reference_extraInitializers = [];
    let _notes_justification_decorators;
    let _notes_justification_initializers = [];
    let _notes_justification_extraInitializers = [];
    let _variance_flag_decorators;
    let _variance_flag_initializers = [];
    let _variance_flag_extraInitializers = [];
    let _created_at_decorators;
    let _created_at_initializers = [];
    let _created_at_extraInitializers = [];
    var LiveExpenseEntity = _classThis = class {
        constructor() {
            // ADDED ! NON-NULL ASSERTION OPERATOR
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.tenant_id = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _tenant_id_initializers, void 0));
            this.project_id = (__runInitializers(this, _tenant_id_extraInitializers), __runInitializers(this, _project_id_initializers, void 0));
            this.wbs_id = (__runInitializers(this, _project_id_extraInitializers), __runInitializers(this, _wbs_id_initializers, void 0));
            this.wbsBudget = (__runInitializers(this, _wbs_id_extraInitializers), __runInitializers(this, _wbsBudget_initializers, void 0));
            this.category_id = (__runInitializers(this, _wbsBudget_extraInitializers), __runInitializers(this, _category_id_initializers, void 0)); // NEW: Category ID
            this.category = (__runInitializers(this, _category_id_extraInitializers), __runInitializers(this, _category_initializers, void 0));
            this.updated_at = (__runInitializers(this, _category_extraInitializers), __runInitializers(this, _updated_at_initializers, void 0));
            // User and Transaction Details (ADDED ! to all)
            this.user_id = (__runInitializers(this, _updated_at_extraInitializers), __runInitializers(this, _user_id_initializers, void 0));
            this.expense_date = (__runInitializers(this, _user_id_extraInitializers), __runInitializers(this, _expense_date_initializers, void 0));
            this.description = (__runInitializers(this, _expense_date_extraInitializers), __runInitializers(this, _description_initializers, void 0));
            // Financial Fields (ADDED ! to all)
            this.unit_cost = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _unit_cost_initializers, void 0));
            this.quantity = (__runInitializers(this, _unit_cost_extraInitializers), __runInitializers(this, _quantity_initializers, void 0));
            this.commitment_lpo_amount = (__runInitializers(this, _quantity_extraInitializers), __runInitializers(this, _commitment_lpo_amount_initializers, void 0));
            this.amount = (__runInitializers(this, _commitment_lpo_amount_extraInitializers), __runInitializers(this, _amount_initializers, void 0));
            this.document_reference = (__runInitializers(this, _amount_extraInitializers), __runInitializers(this, _document_reference_initializers, void 0));
            this.notes_justification = (__runInitializers(this, _document_reference_extraInitializers), __runInitializers(this, _notes_justification_initializers, void 0));
            // Real-time Variance Flag
            this.variance_flag = (__runInitializers(this, _notes_justification_extraInitializers), __runInitializers(this, _variance_flag_initializers, void 0));
            this.created_at = (__runInitializers(this, _variance_flag_extraInitializers), __runInitializers(this, _created_at_initializers, void 0));
            __runInitializers(this, _created_at_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "LiveExpenseEntity");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)("uuid")];
        _tenant_id_decorators = [(0, typeorm_1.Column)({ type: "uuid", nullable: false })];
        _project_id_decorators = [(0, typeorm_1.Column)({ type: "uuid", nullable: true })];
        _wbs_id_decorators = [(0, typeorm_1.Column)({ type: "uuid" })];
        _wbsBudget_decorators = [(0, typeorm_1.ManyToOne)(() => wbs_budget_entity_1.WbsBudgetEntity), (0, typeorm_1.JoinColumn)({ name: "wbs_id" })];
        _category_id_decorators = [(0, typeorm_1.Column)({ type: "uuid", nullable: true })];
        _category_decorators = [(0, typeorm_1.ManyToOne)(() => wbs_category_entity_1.WbsCategoryEntity, (category) => category.liveExpenses), (0, typeorm_1.JoinColumn)({ name: "category_id" })];
        _updated_at_decorators = [(0, typeorm_1.Column)({ type: "timestamptz", nullable: true })];
        _user_id_decorators = [(0, typeorm_1.Column)({ type: "uuid" })];
        _expense_date_decorators = [(0, typeorm_1.Column)({ type: "date", default: () => "CURRENT_DATE" })];
        _description_decorators = [(0, typeorm_1.Column)({ type: "text" })];
        _unit_cost_decorators = [(0, typeorm_1.Column)({ type: "numeric", precision: 19, scale: 4 })];
        _quantity_decorators = [(0, typeorm_1.Column)({ type: "numeric", precision: 19, scale: 4 })];
        _commitment_lpo_amount_decorators = [(0, typeorm_1.Column)({ type: "numeric", precision: 19, scale: 4, default: 0.0 })];
        _amount_decorators = [(0, typeorm_1.Column)({ type: "numeric", precision: 19, scale: 4 })];
        _document_reference_decorators = [(0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true })];
        _notes_justification_decorators = [(0, typeorm_1.Column)({ type: "text", nullable: true })];
        _variance_flag_decorators = [(0, typeorm_1.Column)({ type: "varchar", length: 50, default: "NO_VARIANCE" })];
        _created_at_decorators = [(0, typeorm_1.Column)({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _tenant_id_decorators, { kind: "field", name: "tenant_id", static: false, private: false, access: { has: obj => "tenant_id" in obj, get: obj => obj.tenant_id, set: (obj, value) => { obj.tenant_id = value; } }, metadata: _metadata }, _tenant_id_initializers, _tenant_id_extraInitializers);
        __esDecorate(null, null, _project_id_decorators, { kind: "field", name: "project_id", static: false, private: false, access: { has: obj => "project_id" in obj, get: obj => obj.project_id, set: (obj, value) => { obj.project_id = value; } }, metadata: _metadata }, _project_id_initializers, _project_id_extraInitializers);
        __esDecorate(null, null, _wbs_id_decorators, { kind: "field", name: "wbs_id", static: false, private: false, access: { has: obj => "wbs_id" in obj, get: obj => obj.wbs_id, set: (obj, value) => { obj.wbs_id = value; } }, metadata: _metadata }, _wbs_id_initializers, _wbs_id_extraInitializers);
        __esDecorate(null, null, _wbsBudget_decorators, { kind: "field", name: "wbsBudget", static: false, private: false, access: { has: obj => "wbsBudget" in obj, get: obj => obj.wbsBudget, set: (obj, value) => { obj.wbsBudget = value; } }, metadata: _metadata }, _wbsBudget_initializers, _wbsBudget_extraInitializers);
        __esDecorate(null, null, _category_id_decorators, { kind: "field", name: "category_id", static: false, private: false, access: { has: obj => "category_id" in obj, get: obj => obj.category_id, set: (obj, value) => { obj.category_id = value; } }, metadata: _metadata }, _category_id_initializers, _category_id_extraInitializers);
        __esDecorate(null, null, _category_decorators, { kind: "field", name: "category", static: false, private: false, access: { has: obj => "category" in obj, get: obj => obj.category, set: (obj, value) => { obj.category = value; } }, metadata: _metadata }, _category_initializers, _category_extraInitializers);
        __esDecorate(null, null, _updated_at_decorators, { kind: "field", name: "updated_at", static: false, private: false, access: { has: obj => "updated_at" in obj, get: obj => obj.updated_at, set: (obj, value) => { obj.updated_at = value; } }, metadata: _metadata }, _updated_at_initializers, _updated_at_extraInitializers);
        __esDecorate(null, null, _user_id_decorators, { kind: "field", name: "user_id", static: false, private: false, access: { has: obj => "user_id" in obj, get: obj => obj.user_id, set: (obj, value) => { obj.user_id = value; } }, metadata: _metadata }, _user_id_initializers, _user_id_extraInitializers);
        __esDecorate(null, null, _expense_date_decorators, { kind: "field", name: "expense_date", static: false, private: false, access: { has: obj => "expense_date" in obj, get: obj => obj.expense_date, set: (obj, value) => { obj.expense_date = value; } }, metadata: _metadata }, _expense_date_initializers, _expense_date_extraInitializers);
        __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: obj => "description" in obj, get: obj => obj.description, set: (obj, value) => { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
        __esDecorate(null, null, _unit_cost_decorators, { kind: "field", name: "unit_cost", static: false, private: false, access: { has: obj => "unit_cost" in obj, get: obj => obj.unit_cost, set: (obj, value) => { obj.unit_cost = value; } }, metadata: _metadata }, _unit_cost_initializers, _unit_cost_extraInitializers);
        __esDecorate(null, null, _quantity_decorators, { kind: "field", name: "quantity", static: false, private: false, access: { has: obj => "quantity" in obj, get: obj => obj.quantity, set: (obj, value) => { obj.quantity = value; } }, metadata: _metadata }, _quantity_initializers, _quantity_extraInitializers);
        __esDecorate(null, null, _commitment_lpo_amount_decorators, { kind: "field", name: "commitment_lpo_amount", static: false, private: false, access: { has: obj => "commitment_lpo_amount" in obj, get: obj => obj.commitment_lpo_amount, set: (obj, value) => { obj.commitment_lpo_amount = value; } }, metadata: _metadata }, _commitment_lpo_amount_initializers, _commitment_lpo_amount_extraInitializers);
        __esDecorate(null, null, _amount_decorators, { kind: "field", name: "amount", static: false, private: false, access: { has: obj => "amount" in obj, get: obj => obj.amount, set: (obj, value) => { obj.amount = value; } }, metadata: _metadata }, _amount_initializers, _amount_extraInitializers);
        __esDecorate(null, null, _document_reference_decorators, { kind: "field", name: "document_reference", static: false, private: false, access: { has: obj => "document_reference" in obj, get: obj => obj.document_reference, set: (obj, value) => { obj.document_reference = value; } }, metadata: _metadata }, _document_reference_initializers, _document_reference_extraInitializers);
        __esDecorate(null, null, _notes_justification_decorators, { kind: "field", name: "notes_justification", static: false, private: false, access: { has: obj => "notes_justification" in obj, get: obj => obj.notes_justification, set: (obj, value) => { obj.notes_justification = value; } }, metadata: _metadata }, _notes_justification_initializers, _notes_justification_extraInitializers);
        __esDecorate(null, null, _variance_flag_decorators, { kind: "field", name: "variance_flag", static: false, private: false, access: { has: obj => "variance_flag" in obj, get: obj => obj.variance_flag, set: (obj, value) => { obj.variance_flag = value; } }, metadata: _metadata }, _variance_flag_initializers, _variance_flag_extraInitializers);
        __esDecorate(null, null, _created_at_decorators, { kind: "field", name: "created_at", static: false, private: false, access: { has: obj => "created_at" in obj, get: obj => obj.created_at, set: (obj, value) => { obj.created_at = value; } }, metadata: _metadata }, _created_at_initializers, _created_at_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LiveExpenseEntity = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LiveExpenseEntity = _classThis;
})();
exports.LiveExpenseEntity = LiveExpenseEntity;
