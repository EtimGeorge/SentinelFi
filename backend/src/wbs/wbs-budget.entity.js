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
exports.WbsBudgetEntity = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../auth/user.entity");
const project_entity_1 = require("../projects/project.entity"); // NEW: Import ProjectEntity
const wbs_category_entity_1 = require("./wbs-category.entity"); // NEW: Import WbsCategoryEntity
const wbs_budget_status_enum_1 = require("../../../shared/types/wbs-budget-status.enum"); // NEW: Import WbsBudgetStatus
let WbsBudgetEntity = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)({ name: "wbs_budget", schema: "client_template" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _wbs_id_decorators;
    let _wbs_id_initializers = [];
    let _wbs_id_extraInitializers = [];
    let _project_id_decorators;
    let _project_id_initializers = [];
    let _project_id_extraInitializers = [];
    let _project_decorators;
    let _project_initializers = [];
    let _project_extraInitializers = [];
    let _parent_wbs_id_decorators;
    let _parent_wbs_id_initializers = [];
    let _parent_wbs_id_extraInitializers = [];
    let _parent_decorators;
    let _parent_initializers = [];
    let _parent_extraInitializers = [];
    let _children_decorators;
    let _children_initializers = [];
    let _children_extraInitializers = [];
    let _category_id_decorators;
    let _category_id_initializers = [];
    let _category_id_extraInitializers = [];
    let _category_decorators;
    let _category_initializers = [];
    let _category_extraInitializers = [];
    let _wbs_code_decorators;
    let _wbs_code_initializers = [];
    let _wbs_code_extraInitializers = [];
    let _description_decorators;
    let _description_initializers = [];
    let _description_extraInitializers = [];
    let _unit_cost_budgeted_decorators;
    let _unit_cost_budgeted_initializers = [];
    let _unit_cost_budgeted_extraInitializers = [];
    let _quantity_budgeted_decorators;
    let _quantity_budgeted_initializers = [];
    let _quantity_budgeted_extraInitializers = [];
    let _days_budgeted_decorators;
    let _days_budgeted_initializers = [];
    let _days_budgeted_extraInitializers = [];
    let _total_cost_budgeted_decorators;
    let _total_cost_budgeted_initializers = [];
    let _total_cost_budgeted_extraInitializers = [];
    let _total_cost_actual_decorators;
    let _total_cost_actual_initializers = [];
    let _total_cost_actual_extraInitializers = [];
    let _status_decorators;
    let _status_initializers = [];
    let _status_extraInitializers = [];
    let _created_at_decorators;
    let _created_at_initializers = [];
    let _created_at_extraInitializers = [];
    let _updated_at_decorators;
    let _updated_at_initializers = [];
    let _updated_at_extraInitializers = [];
    let _tenant_id_decorators;
    let _tenant_id_initializers = [];
    let _tenant_id_extraInitializers = [];
    let _user_decorators;
    let _user_initializers = [];
    let _user_extraInitializers = [];
    var WbsBudgetEntity = _classThis = class {
        constructor() {
            this.wbs_id = __runInitializers(this, _wbs_id_initializers, void 0);
            this.project_id = (__runInitializers(this, _wbs_id_extraInitializers), __runInitializers(this, _project_id_initializers, void 0));
            this.project = (__runInitializers(this, _project_id_extraInitializers), __runInitializers(this, _project_initializers, void 0));
            this.parent_wbs_id = (__runInitializers(this, _project_extraInitializers), __runInitializers(this, _parent_wbs_id_initializers, void 0));
            this.parent = (__runInitializers(this, _parent_wbs_id_extraInitializers), __runInitializers(this, _parent_initializers, void 0));
            this.children = (__runInitializers(this, _parent_extraInitializers), __runInitializers(this, _children_initializers, void 0));
            this.category_id = (__runInitializers(this, _children_extraInitializers), __runInitializers(this, _category_id_initializers, void 0)); // NEW: Category ID
            this.category = (__runInitializers(this, _category_id_extraInitializers), __runInitializers(this, _category_initializers, void 0));
            this.wbs_code = (__runInitializers(this, _category_extraInitializers), __runInitializers(this, _wbs_code_initializers, void 0));
            this.description = (__runInitializers(this, _wbs_code_extraInitializers), __runInitializers(this, _description_initializers, void 0));
            // Financial Fields
            this.unit_cost_budgeted = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _unit_cost_budgeted_initializers, void 0));
            this.quantity_budgeted = (__runInitializers(this, _unit_cost_budgeted_extraInitializers), __runInitializers(this, _quantity_budgeted_initializers, void 0));
            this.days_budgeted = (__runInitializers(this, _quantity_budgeted_extraInitializers), __runInitializers(this, _days_budgeted_initializers, void 0));
            this.total_cost_budgeted = (__runInitializers(this, _days_budgeted_extraInitializers), __runInitializers(this, _total_cost_budgeted_initializers, void 0));
            this.total_cost_actual = (__runInitializers(this, _total_cost_budgeted_extraInitializers), __runInitializers(this, _total_cost_actual_initializers, void 0)); // NEW: To track actual spend
            // Status/Audit Fields
            this.status = (__runInitializers(this, _total_cost_actual_extraInitializers), __runInitializers(this, _status_initializers, void 0));
            this.created_at = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _created_at_initializers, void 0));
            this.updated_at = (__runInitializers(this, _created_at_extraInitializers), __runInitializers(this, _updated_at_initializers, void 0));
            this.tenant_id = (__runInitializers(this, _updated_at_extraInitializers), __runInitializers(this, _tenant_id_initializers, void 0));
            this.user = (__runInitializers(this, _tenant_id_extraInitializers), __runInitializers(this, _user_initializers, void 0));
            __runInitializers(this, _user_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "WbsBudgetEntity");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _wbs_id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)("uuid")];
        _project_id_decorators = [(0, typeorm_1.Column)({ type: "uuid", nullable: false })];
        _project_decorators = [(0, typeorm_1.ManyToOne)(() => project_entity_1.ProjectEntity, (project) => project.wbsBudgets, {
                onDelete: "CASCADE",
            }), (0, typeorm_1.JoinColumn)({ name: "project_id" })];
        _parent_wbs_id_decorators = [(0, typeorm_1.Column)({ type: "uuid", nullable: true })];
        _parent_decorators = [(0, typeorm_1.ManyToOne)(() => WbsBudgetEntity, (wbs) => wbs.children), (0, typeorm_1.JoinColumn)({ name: "parent_wbs_id" })];
        _children_decorators = [(0, typeorm_1.OneToMany)(() => WbsBudgetEntity, (wbs) => wbs.parent)];
        _category_id_decorators = [(0, typeorm_1.Column)({ type: "uuid", nullable: true })];
        _category_decorators = [(0, typeorm_1.ManyToOne)(() => wbs_category_entity_1.WbsCategoryEntity, (category) => category.wbsBudgets), (0, typeorm_1.JoinColumn)({ name: "category_id" })];
        _wbs_code_decorators = [(0, typeorm_1.Column)({ unique: true, length: 50 })];
        _description_decorators = [(0, typeorm_1.Column)({ type: "text" })];
        _unit_cost_budgeted_decorators = [(0, typeorm_1.Column)({ type: "numeric", precision: 19, scale: 4 })];
        _quantity_budgeted_decorators = [(0, typeorm_1.Column)({ type: "numeric", precision: 19, scale: 4 })];
        _days_budgeted_decorators = [(0, typeorm_1.Column)({ type: "int", nullable: true })];
        _total_cost_budgeted_decorators = [(0, typeorm_1.Column)({ type: "numeric", precision: 19, scale: 4 })];
        _total_cost_actual_decorators = [(0, typeorm_1.Column)({ type: "numeric", precision: 19, scale: 4, default: 0 })];
        _status_decorators = [(0, typeorm_1.Column)({
                type: "enum",
                enum: wbs_budget_status_enum_1.WbsBudgetStatus,
                default: wbs_budget_status_enum_1.WbsBudgetStatus.PENDING,
            })];
        _created_at_decorators = [(0, typeorm_1.Column)({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })];
        _updated_at_decorators = [(0, typeorm_1.Column)({ type: "timestamptz", nullable: true })];
        _tenant_id_decorators = [(0, typeorm_1.Column)({ type: "uuid", nullable: false })];
        _user_decorators = [(0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity), (0, typeorm_1.JoinColumn)({ name: "user_id" })];
        __esDecorate(null, null, _wbs_id_decorators, { kind: "field", name: "wbs_id", static: false, private: false, access: { has: obj => "wbs_id" in obj, get: obj => obj.wbs_id, set: (obj, value) => { obj.wbs_id = value; } }, metadata: _metadata }, _wbs_id_initializers, _wbs_id_extraInitializers);
        __esDecorate(null, null, _project_id_decorators, { kind: "field", name: "project_id", static: false, private: false, access: { has: obj => "project_id" in obj, get: obj => obj.project_id, set: (obj, value) => { obj.project_id = value; } }, metadata: _metadata }, _project_id_initializers, _project_id_extraInitializers);
        __esDecorate(null, null, _project_decorators, { kind: "field", name: "project", static: false, private: false, access: { has: obj => "project" in obj, get: obj => obj.project, set: (obj, value) => { obj.project = value; } }, metadata: _metadata }, _project_initializers, _project_extraInitializers);
        __esDecorate(null, null, _parent_wbs_id_decorators, { kind: "field", name: "parent_wbs_id", static: false, private: false, access: { has: obj => "parent_wbs_id" in obj, get: obj => obj.parent_wbs_id, set: (obj, value) => { obj.parent_wbs_id = value; } }, metadata: _metadata }, _parent_wbs_id_initializers, _parent_wbs_id_extraInitializers);
        __esDecorate(null, null, _parent_decorators, { kind: "field", name: "parent", static: false, private: false, access: { has: obj => "parent" in obj, get: obj => obj.parent, set: (obj, value) => { obj.parent = value; } }, metadata: _metadata }, _parent_initializers, _parent_extraInitializers);
        __esDecorate(null, null, _children_decorators, { kind: "field", name: "children", static: false, private: false, access: { has: obj => "children" in obj, get: obj => obj.children, set: (obj, value) => { obj.children = value; } }, metadata: _metadata }, _children_initializers, _children_extraInitializers);
        __esDecorate(null, null, _category_id_decorators, { kind: "field", name: "category_id", static: false, private: false, access: { has: obj => "category_id" in obj, get: obj => obj.category_id, set: (obj, value) => { obj.category_id = value; } }, metadata: _metadata }, _category_id_initializers, _category_id_extraInitializers);
        __esDecorate(null, null, _category_decorators, { kind: "field", name: "category", static: false, private: false, access: { has: obj => "category" in obj, get: obj => obj.category, set: (obj, value) => { obj.category = value; } }, metadata: _metadata }, _category_initializers, _category_extraInitializers);
        __esDecorate(null, null, _wbs_code_decorators, { kind: "field", name: "wbs_code", static: false, private: false, access: { has: obj => "wbs_code" in obj, get: obj => obj.wbs_code, set: (obj, value) => { obj.wbs_code = value; } }, metadata: _metadata }, _wbs_code_initializers, _wbs_code_extraInitializers);
        __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: obj => "description" in obj, get: obj => obj.description, set: (obj, value) => { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
        __esDecorate(null, null, _unit_cost_budgeted_decorators, { kind: "field", name: "unit_cost_budgeted", static: false, private: false, access: { has: obj => "unit_cost_budgeted" in obj, get: obj => obj.unit_cost_budgeted, set: (obj, value) => { obj.unit_cost_budgeted = value; } }, metadata: _metadata }, _unit_cost_budgeted_initializers, _unit_cost_budgeted_extraInitializers);
        __esDecorate(null, null, _quantity_budgeted_decorators, { kind: "field", name: "quantity_budgeted", static: false, private: false, access: { has: obj => "quantity_budgeted" in obj, get: obj => obj.quantity_budgeted, set: (obj, value) => { obj.quantity_budgeted = value; } }, metadata: _metadata }, _quantity_budgeted_initializers, _quantity_budgeted_extraInitializers);
        __esDecorate(null, null, _days_budgeted_decorators, { kind: "field", name: "days_budgeted", static: false, private: false, access: { has: obj => "days_budgeted" in obj, get: obj => obj.days_budgeted, set: (obj, value) => { obj.days_budgeted = value; } }, metadata: _metadata }, _days_budgeted_initializers, _days_budgeted_extraInitializers);
        __esDecorate(null, null, _total_cost_budgeted_decorators, { kind: "field", name: "total_cost_budgeted", static: false, private: false, access: { has: obj => "total_cost_budgeted" in obj, get: obj => obj.total_cost_budgeted, set: (obj, value) => { obj.total_cost_budgeted = value; } }, metadata: _metadata }, _total_cost_budgeted_initializers, _total_cost_budgeted_extraInitializers);
        __esDecorate(null, null, _total_cost_actual_decorators, { kind: "field", name: "total_cost_actual", static: false, private: false, access: { has: obj => "total_cost_actual" in obj, get: obj => obj.total_cost_actual, set: (obj, value) => { obj.total_cost_actual = value; } }, metadata: _metadata }, _total_cost_actual_initializers, _total_cost_actual_extraInitializers);
        __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status, set: (obj, value) => { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
        __esDecorate(null, null, _created_at_decorators, { kind: "field", name: "created_at", static: false, private: false, access: { has: obj => "created_at" in obj, get: obj => obj.created_at, set: (obj, value) => { obj.created_at = value; } }, metadata: _metadata }, _created_at_initializers, _created_at_extraInitializers);
        __esDecorate(null, null, _updated_at_decorators, { kind: "field", name: "updated_at", static: false, private: false, access: { has: obj => "updated_at" in obj, get: obj => obj.updated_at, set: (obj, value) => { obj.updated_at = value; } }, metadata: _metadata }, _updated_at_initializers, _updated_at_extraInitializers);
        __esDecorate(null, null, _tenant_id_decorators, { kind: "field", name: "tenant_id", static: false, private: false, access: { has: obj => "tenant_id" in obj, get: obj => obj.tenant_id, set: (obj, value) => { obj.tenant_id = value; } }, metadata: _metadata }, _tenant_id_initializers, _tenant_id_extraInitializers);
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: obj => "user" in obj, get: obj => obj.user, set: (obj, value) => { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WbsBudgetEntity = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WbsBudgetEntity = _classThis;
})();
exports.WbsBudgetEntity = WbsBudgetEntity;
