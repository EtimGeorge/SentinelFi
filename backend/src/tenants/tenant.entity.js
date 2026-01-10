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
exports.TenantEntity = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../src/auth/user.entity"); // Relative path to UserEntity
let TenantEntity = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)({ name: "tenants", schema: "public" }), (0, typeorm_1.Unique)(["name"]), (0, typeorm_1.Unique)(["schema_name"])];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _tenant_id_decorators;
    let _tenant_id_initializers = [];
    let _tenant_id_extraInitializers = [];
    let _name_decorators;
    let _name_initializers = [];
    let _name_extraInitializers = [];
    let _schema_name_decorators;
    let _schema_name_initializers = [];
    let _schema_name_extraInitializers = [];
    let _is_active_decorators;
    let _is_active_initializers = [];
    let _is_active_extraInitializers = [];
    let _created_at_decorators;
    let _created_at_initializers = [];
    let _created_at_extraInitializers = [];
    let _users_decorators;
    let _users_initializers = [];
    let _users_extraInitializers = [];
    var TenantEntity = _classThis = class {
        constructor() {
            this.tenant_id = __runInitializers(this, _tenant_id_initializers, void 0); // Renamed from 'id' to 'tenant_id' for clarity and consistency
            this.name = (__runInitializers(this, _tenant_id_extraInitializers), __runInitializers(this, _name_initializers, void 0)); // Unique identifier for the tenant/client (e.g., Company Name)
            this.schema_name = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _schema_name_initializers, void 0));
            this.is_active = (__runInitializers(this, _schema_name_extraInitializers), __runInitializers(this, _is_active_initializers, void 0));
            this.created_at = (__runInitializers(this, _is_active_extraInitializers), __runInitializers(this, _created_at_initializers, void 0));
            this.users = (__runInitializers(this, _created_at_extraInitializers), __runInitializers(this, _users_initializers, void 0));
            __runInitializers(this, _users_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "TenantEntity");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _tenant_id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)("uuid")];
        _name_decorators = [(0, typeorm_1.Column)({ length: 255, unique: true })];
        _schema_name_decorators = [(0, typeorm_1.Column)({ length: 63, unique: true })];
        _is_active_decorators = [(0, typeorm_1.Column)({ type: "boolean", default: true })];
        _created_at_decorators = [(0, typeorm_1.Column)({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })];
        _users_decorators = [(0, typeorm_1.OneToMany)(() => user_entity_1.UserEntity, (user) => user.tenant)];
        __esDecorate(null, null, _tenant_id_decorators, { kind: "field", name: "tenant_id", static: false, private: false, access: { has: obj => "tenant_id" in obj, get: obj => obj.tenant_id, set: (obj, value) => { obj.tenant_id = value; } }, metadata: _metadata }, _tenant_id_initializers, _tenant_id_extraInitializers);
        __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: obj => "name" in obj, get: obj => obj.name, set: (obj, value) => { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
        __esDecorate(null, null, _schema_name_decorators, { kind: "field", name: "schema_name", static: false, private: false, access: { has: obj => "schema_name" in obj, get: obj => obj.schema_name, set: (obj, value) => { obj.schema_name = value; } }, metadata: _metadata }, _schema_name_initializers, _schema_name_extraInitializers);
        __esDecorate(null, null, _is_active_decorators, { kind: "field", name: "is_active", static: false, private: false, access: { has: obj => "is_active" in obj, get: obj => obj.is_active, set: (obj, value) => { obj.is_active = value; } }, metadata: _metadata }, _is_active_initializers, _is_active_extraInitializers);
        __esDecorate(null, null, _created_at_decorators, { kind: "field", name: "created_at", static: false, private: false, access: { has: obj => "created_at" in obj, get: obj => obj.created_at, set: (obj, value) => { obj.created_at = value; } }, metadata: _metadata }, _created_at_initializers, _created_at_extraInitializers);
        __esDecorate(null, null, _users_decorators, { kind: "field", name: "users", static: false, private: false, access: { has: obj => "users" in obj, get: obj => obj.users, set: (obj, value) => { obj.users = value; } }, metadata: _metadata }, _users_initializers, _users_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TenantEntity = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TenantEntity = _classThis;
})();
exports.TenantEntity = TenantEntity;
