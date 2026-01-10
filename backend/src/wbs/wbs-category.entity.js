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
exports.WbsCategoryEntity = void 0;
const typeorm_1 = require("typeorm");
const wbs_budget_entity_1 = require("./wbs-budget.entity"); // NEW: Import WbsBudgetEntity
const live_expense_entity_1 = require("./live-expense.entity"); // NEW: Import LiveExpenseEntity
let WbsCategoryEntity = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)({ name: "wbs_category", schema: "client_template" }), (0, typeorm_1.Unique)(["name", "tenant_id"])];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _name_decorators;
    let _name_initializers = [];
    let _name_extraInitializers = [];
    let _tenant_id_decorators;
    let _tenant_id_initializers = [];
    let _tenant_id_extraInitializers = [];
    let _wbsBudgets_decorators;
    let _wbsBudgets_initializers = [];
    let _wbsBudgets_extraInitializers = [];
    let _liveExpenses_decorators;
    let _liveExpenses_initializers = [];
    let _liveExpenses_extraInitializers = [];
    let _created_at_decorators;
    let _created_at_initializers = [];
    let _created_at_extraInitializers = [];
    var WbsCategoryEntity = _classThis = class {
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.name = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _name_initializers, void 0)); // Renamed from description
            this.tenant_id = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _tenant_id_initializers, void 0));
            this.wbsBudgets = (__runInitializers(this, _tenant_id_extraInitializers), __runInitializers(this, _wbsBudgets_initializers, void 0));
            this.liveExpenses = (__runInitializers(this, _wbsBudgets_extraInitializers), __runInitializers(this, _liveExpenses_initializers, void 0));
            this.created_at = (__runInitializers(this, _liveExpenses_extraInitializers), __runInitializers(this, _created_at_initializers, void 0));
            __runInitializers(this, _created_at_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "WbsCategoryEntity");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)("uuid")];
        _name_decorators = [(0, typeorm_1.Column)({ type: "varchar", length: 255 })];
        _tenant_id_decorators = [(0, typeorm_1.Column)({ type: "uuid", nullable: false })];
        _wbsBudgets_decorators = [(0, typeorm_1.OneToMany)(() => wbs_budget_entity_1.WbsBudgetEntity, (wbsBudget) => wbsBudget.category)];
        _liveExpenses_decorators = [(0, typeorm_1.OneToMany)(() => live_expense_entity_1.LiveExpenseEntity, (liveExpense) => liveExpense.category)];
        _created_at_decorators = [(0, typeorm_1.Column)({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: obj => "name" in obj, get: obj => obj.name, set: (obj, value) => { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
        __esDecorate(null, null, _tenant_id_decorators, { kind: "field", name: "tenant_id", static: false, private: false, access: { has: obj => "tenant_id" in obj, get: obj => obj.tenant_id, set: (obj, value) => { obj.tenant_id = value; } }, metadata: _metadata }, _tenant_id_initializers, _tenant_id_extraInitializers);
        __esDecorate(null, null, _wbsBudgets_decorators, { kind: "field", name: "wbsBudgets", static: false, private: false, access: { has: obj => "wbsBudgets" in obj, get: obj => obj.wbsBudgets, set: (obj, value) => { obj.wbsBudgets = value; } }, metadata: _metadata }, _wbsBudgets_initializers, _wbsBudgets_extraInitializers);
        __esDecorate(null, null, _liveExpenses_decorators, { kind: "field", name: "liveExpenses", static: false, private: false, access: { has: obj => "liveExpenses" in obj, get: obj => obj.liveExpenses, set: (obj, value) => { obj.liveExpenses = value; } }, metadata: _metadata }, _liveExpenses_initializers, _liveExpenses_extraInitializers);
        __esDecorate(null, null, _created_at_decorators, { kind: "field", name: "created_at", static: false, private: false, access: { has: obj => "created_at" in obj, get: obj => obj.created_at, set: (obj, value) => { obj.created_at = value; } }, metadata: _metadata }, _created_at_initializers, _created_at_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WbsCategoryEntity = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WbsCategoryEntity = _classThis;
})();
exports.WbsCategoryEntity = WbsCategoryEntity;
