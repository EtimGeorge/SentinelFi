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
exports.ProjectEntity = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../auth/user.entity"); // Assuming UserEntity exists for creator
const wbs_budget_entity_1 = require("../wbs/wbs-budget.entity"); // Link to WBS Budgets
const project_enum_1 = require("./enums/project.enum");
let ProjectEntity = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)({ name: "project", schema: "client_template" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _project_id_decorators;
    let _project_id_initializers = [];
    let _project_id_extraInitializers = [];
    let _project_name_decorators;
    let _project_name_initializers = [];
    let _project_name_extraInitializers = [];
    let _rfq_number_decorators;
    let _rfq_number_initializers = [];
    let _rfq_number_extraInitializers = [];
    let _sow_details_decorators;
    let _sow_details_initializers = [];
    let _sow_details_extraInitializers = [];
    let _notes_decorators;
    let _notes_initializers = [];
    let _notes_extraInitializers = [];
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
    let _created_by_user_id_decorators;
    let _created_by_user_id_initializers = [];
    let _created_by_user_id_extraInitializers = [];
    let _createdBy_decorators;
    let _createdBy_initializers = [];
    let _createdBy_extraInitializers = [];
    let _wbsBudgets_decorators;
    let _wbsBudgets_initializers = [];
    let _wbsBudgets_extraInitializers = [];
    var ProjectEntity = _classThis = class {
        constructor() {
            this.project_id = __runInitializers(this, _project_id_initializers, void 0);
            this.project_name = (__runInitializers(this, _project_id_extraInitializers), __runInitializers(this, _project_name_initializers, void 0));
            this.rfq_number = (__runInitializers(this, _project_name_extraInitializers), __runInitializers(this, _rfq_number_initializers, void 0)); // Request for Quotation
            this.sow_details = (__runInitializers(this, _rfq_number_extraInitializers), __runInitializers(this, _sow_details_initializers, void 0)); // Statement of Work details
            this.notes = (__runInitializers(this, _sow_details_extraInitializers), __runInitializers(this, _notes_initializers, void 0));
            this.status = (__runInitializers(this, _notes_extraInitializers), __runInitializers(this, _status_initializers, void 0));
            this.created_at = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _created_at_initializers, void 0));
            this.updated_at = (__runInitializers(this, _created_at_extraInitializers), __runInitializers(this, _updated_at_initializers, void 0));
            this.tenant_id = (__runInitializers(this, _updated_at_extraInitializers), __runInitializers(this, _tenant_id_initializers, void 0));
            // Foreign Key to User who created the project
            this.created_by_user_id = (__runInitializers(this, _tenant_id_extraInitializers), __runInitializers(this, _created_by_user_id_initializers, void 0));
            this.createdBy = (__runInitializers(this, _created_by_user_id_extraInitializers), __runInitializers(this, _createdBy_initializers, void 0));
            // One-to-Many relation with WbsBudgetEntity
            this.wbsBudgets = (__runInitializers(this, _createdBy_extraInitializers), __runInitializers(this, _wbsBudgets_initializers, void 0));
            __runInitializers(this, _wbsBudgets_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "ProjectEntity");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _project_id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)("uuid")];
        _project_name_decorators = [(0, typeorm_1.Column)({ type: "varchar", length: 255, unique: true })];
        _rfq_number_decorators = [(0, typeorm_1.Column)({ type: "text", nullable: true })];
        _sow_details_decorators = [(0, typeorm_1.Column)({ type: "text", nullable: true })];
        _notes_decorators = [(0, typeorm_1.Column)({ type: "text", nullable: true })];
        _status_decorators = [(0, typeorm_1.Column)({
                type: "enum",
                enum: project_enum_1.ProjectStatus,
                default: project_enum_1.ProjectStatus.ACTIVE,
            })];
        _created_at_decorators = [(0, typeorm_1.Column)({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })];
        _updated_at_decorators = [(0, typeorm_1.Column)({ type: "timestamptz", nullable: true })];
        _tenant_id_decorators = [(0, typeorm_1.Column)({ type: "uuid", nullable: false })];
        _created_by_user_id_decorators = [(0, typeorm_1.Column)({ type: "uuid" })];
        _createdBy_decorators = [(0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity), (0, typeorm_1.JoinColumn)({ name: "created_by_user_id" })];
        _wbsBudgets_decorators = [(0, typeorm_1.OneToMany)(() => wbs_budget_entity_1.WbsBudgetEntity, (wbsBudget) => wbsBudget.project)];
        __esDecorate(null, null, _project_id_decorators, { kind: "field", name: "project_id", static: false, private: false, access: { has: obj => "project_id" in obj, get: obj => obj.project_id, set: (obj, value) => { obj.project_id = value; } }, metadata: _metadata }, _project_id_initializers, _project_id_extraInitializers);
        __esDecorate(null, null, _project_name_decorators, { kind: "field", name: "project_name", static: false, private: false, access: { has: obj => "project_name" in obj, get: obj => obj.project_name, set: (obj, value) => { obj.project_name = value; } }, metadata: _metadata }, _project_name_initializers, _project_name_extraInitializers);
        __esDecorate(null, null, _rfq_number_decorators, { kind: "field", name: "rfq_number", static: false, private: false, access: { has: obj => "rfq_number" in obj, get: obj => obj.rfq_number, set: (obj, value) => { obj.rfq_number = value; } }, metadata: _metadata }, _rfq_number_initializers, _rfq_number_extraInitializers);
        __esDecorate(null, null, _sow_details_decorators, { kind: "field", name: "sow_details", static: false, private: false, access: { has: obj => "sow_details" in obj, get: obj => obj.sow_details, set: (obj, value) => { obj.sow_details = value; } }, metadata: _metadata }, _sow_details_initializers, _sow_details_extraInitializers);
        __esDecorate(null, null, _notes_decorators, { kind: "field", name: "notes", static: false, private: false, access: { has: obj => "notes" in obj, get: obj => obj.notes, set: (obj, value) => { obj.notes = value; } }, metadata: _metadata }, _notes_initializers, _notes_extraInitializers);
        __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status, set: (obj, value) => { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
        __esDecorate(null, null, _created_at_decorators, { kind: "field", name: "created_at", static: false, private: false, access: { has: obj => "created_at" in obj, get: obj => obj.created_at, set: (obj, value) => { obj.created_at = value; } }, metadata: _metadata }, _created_at_initializers, _created_at_extraInitializers);
        __esDecorate(null, null, _updated_at_decorators, { kind: "field", name: "updated_at", static: false, private: false, access: { has: obj => "updated_at" in obj, get: obj => obj.updated_at, set: (obj, value) => { obj.updated_at = value; } }, metadata: _metadata }, _updated_at_initializers, _updated_at_extraInitializers);
        __esDecorate(null, null, _tenant_id_decorators, { kind: "field", name: "tenant_id", static: false, private: false, access: { has: obj => "tenant_id" in obj, get: obj => obj.tenant_id, set: (obj, value) => { obj.tenant_id = value; } }, metadata: _metadata }, _tenant_id_initializers, _tenant_id_extraInitializers);
        __esDecorate(null, null, _created_by_user_id_decorators, { kind: "field", name: "created_by_user_id", static: false, private: false, access: { has: obj => "created_by_user_id" in obj, get: obj => obj.created_by_user_id, set: (obj, value) => { obj.created_by_user_id = value; } }, metadata: _metadata }, _created_by_user_id_initializers, _created_by_user_id_extraInitializers);
        __esDecorate(null, null, _createdBy_decorators, { kind: "field", name: "createdBy", static: false, private: false, access: { has: obj => "createdBy" in obj, get: obj => obj.createdBy, set: (obj, value) => { obj.createdBy = value; } }, metadata: _metadata }, _createdBy_initializers, _createdBy_extraInitializers);
        __esDecorate(null, null, _wbsBudgets_decorators, { kind: "field", name: "wbsBudgets", static: false, private: false, access: { has: obj => "wbsBudgets" in obj, get: obj => obj.wbsBudgets, set: (obj, value) => { obj.wbsBudgets = value; } }, metadata: _metadata }, _wbsBudgets_initializers, _wbsBudgets_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ProjectEntity = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ProjectEntity = _classThis;
})();
exports.ProjectEntity = ProjectEntity;
