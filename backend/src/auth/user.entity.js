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
exports.UserEntity = void 0;
const typeorm_1 = require("typeorm");
const role_enum_1 = require("@shared/types/role.enum");
const tenant_entity_1 = require("../../src/tenants/tenant.entity"); // Relative path to TenantEntity
let UserEntity = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)({ name: "user", schema: "public" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _email_decorators;
    let _email_initializers = [];
    let _email_extraInitializers = [];
    let _password_hash_decorators;
    let _password_hash_initializers = [];
    let _password_hash_extraInitializers = [];
    let _first_name_decorators;
    let _first_name_initializers = [];
    let _first_name_extraInitializers = [];
    let _last_name_decorators;
    let _last_name_initializers = [];
    let _last_name_extraInitializers = [];
    let _role_decorators;
    let _role_initializers = [];
    let _role_extraInitializers = [];
    let _is_active_decorators;
    let _is_active_initializers = [];
    let _is_active_extraInitializers = [];
    let _created_at_decorators;
    let _created_at_initializers = [];
    let _created_at_extraInitializers = [];
    let _updated_at_decorators;
    let _updated_at_initializers = [];
    let _updated_at_extraInitializers = [];
    let _tenant_id_decorators;
    let _tenant_id_initializers = [];
    let _tenant_id_extraInitializers = [];
    let _tenant_decorators;
    let _tenant_initializers = [];
    let _tenant_extraInitializers = [];
    let _resetPasswordToken_decorators;
    let _resetPasswordToken_initializers = [];
    let _resetPasswordToken_extraInitializers = [];
    let _resetPasswordExpires_decorators;
    let _resetPasswordExpires_initializers = [];
    let _resetPasswordExpires_extraInitializers = [];
    var UserEntity = _classThis = class {
        constructor() {
            // Primary Key (Used as the user_id in LiveExpense table)
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.email = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _email_initializers, void 0));
            this.password_hash = (__runInitializers(this, _email_extraInitializers), __runInitializers(this, _password_hash_initializers, void 0));
            this.first_name = (__runInitializers(this, _password_hash_extraInitializers), __runInitializers(this, _first_name_initializers, void 0));
            this.last_name = (__runInitializers(this, _first_name_extraInitializers), __runInitializers(this, _last_name_initializers, void 0));
            this.role = (__runInitializers(this, _last_name_extraInitializers), __runInitializers(this, _role_initializers, void 0));
            this.is_active = (__runInitializers(this, _role_extraInitializers), __runInitializers(this, _is_active_initializers, void 0));
            this.created_at = (__runInitializers(this, _is_active_extraInitializers), __runInitializers(this, _created_at_initializers, void 0));
            this.updated_at = (__runInitializers(this, _created_at_extraInitializers), __runInitializers(this, _updated_at_initializers, void 0));
            // Multi-tenancy: Link user to a tenant
            this.tenant_id = (__runInitializers(this, _updated_at_extraInitializers), __runInitializers(this, _tenant_id_initializers, void 0));
            this.tenant = (__runInitializers(this, _tenant_id_extraInitializers), __runInitializers(this, _tenant_initializers, void 0));
            // Password Reset Fields
            this.resetPasswordToken = (__runInitializers(this, _tenant_extraInitializers), __runInitializers(this, _resetPasswordToken_initializers, void 0)); // Stores the hashed reset token
            this.resetPasswordExpires = (__runInitializers(this, _resetPasswordToken_extraInitializers), __runInitializers(this, _resetPasswordExpires_initializers, void 0));
            __runInitializers(this, _resetPasswordExpires_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "UserEntity");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)("uuid")];
        _email_decorators = [(0, typeorm_1.Column)({ unique: true })];
        _password_hash_decorators = [(0, typeorm_1.Column)({ select: false })];
        _first_name_decorators = [(0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true })];
        _last_name_decorators = [(0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true })];
        _role_decorators = [(0, typeorm_1.Column)({
                type: "enum",
                enum: role_enum_1.Role,
                default: role_enum_1.Role.AssignedProjectUser, // Default role for accountability (Crucial Constraint)
            })];
        _is_active_decorators = [(0, typeorm_1.Column)({ default: true })];
        _created_at_decorators = [(0, typeorm_1.Column)({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })];
        _updated_at_decorators = [(0, typeorm_1.Column)({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })];
        _tenant_id_decorators = [(0, typeorm_1.Column)({ type: "uuid", nullable: true })];
        _tenant_decorators = [(0, typeorm_1.ManyToOne)(() => tenant_entity_1.TenantEntity, (tenant) => tenant.users, {
                nullable: true, // System-level users might not belong to a specific tenant
                onDelete: "SET NULL", // What happens to user if tenant is deleted
            }), (0, typeorm_1.JoinColumn)({ name: "tenant_id" })];
        _resetPasswordToken_decorators = [(0, typeorm_1.Column)({ nullable: true, name: 'reset_password_token' })];
        _resetPasswordExpires_decorators = [(0, typeorm_1.Column)({ type: 'timestamptz', nullable: true, name: 'reset_password_expires' })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _email_decorators, { kind: "field", name: "email", static: false, private: false, access: { has: obj => "email" in obj, get: obj => obj.email, set: (obj, value) => { obj.email = value; } }, metadata: _metadata }, _email_initializers, _email_extraInitializers);
        __esDecorate(null, null, _password_hash_decorators, { kind: "field", name: "password_hash", static: false, private: false, access: { has: obj => "password_hash" in obj, get: obj => obj.password_hash, set: (obj, value) => { obj.password_hash = value; } }, metadata: _metadata }, _password_hash_initializers, _password_hash_extraInitializers);
        __esDecorate(null, null, _first_name_decorators, { kind: "field", name: "first_name", static: false, private: false, access: { has: obj => "first_name" in obj, get: obj => obj.first_name, set: (obj, value) => { obj.first_name = value; } }, metadata: _metadata }, _first_name_initializers, _first_name_extraInitializers);
        __esDecorate(null, null, _last_name_decorators, { kind: "field", name: "last_name", static: false, private: false, access: { has: obj => "last_name" in obj, get: obj => obj.last_name, set: (obj, value) => { obj.last_name = value; } }, metadata: _metadata }, _last_name_initializers, _last_name_extraInitializers);
        __esDecorate(null, null, _role_decorators, { kind: "field", name: "role", static: false, private: false, access: { has: obj => "role" in obj, get: obj => obj.role, set: (obj, value) => { obj.role = value; } }, metadata: _metadata }, _role_initializers, _role_extraInitializers);
        __esDecorate(null, null, _is_active_decorators, { kind: "field", name: "is_active", static: false, private: false, access: { has: obj => "is_active" in obj, get: obj => obj.is_active, set: (obj, value) => { obj.is_active = value; } }, metadata: _metadata }, _is_active_initializers, _is_active_extraInitializers);
        __esDecorate(null, null, _created_at_decorators, { kind: "field", name: "created_at", static: false, private: false, access: { has: obj => "created_at" in obj, get: obj => obj.created_at, set: (obj, value) => { obj.created_at = value; } }, metadata: _metadata }, _created_at_initializers, _created_at_extraInitializers);
        __esDecorate(null, null, _updated_at_decorators, { kind: "field", name: "updated_at", static: false, private: false, access: { has: obj => "updated_at" in obj, get: obj => obj.updated_at, set: (obj, value) => { obj.updated_at = value; } }, metadata: _metadata }, _updated_at_initializers, _updated_at_extraInitializers);
        __esDecorate(null, null, _tenant_id_decorators, { kind: "field", name: "tenant_id", static: false, private: false, access: { has: obj => "tenant_id" in obj, get: obj => obj.tenant_id, set: (obj, value) => { obj.tenant_id = value; } }, metadata: _metadata }, _tenant_id_initializers, _tenant_id_extraInitializers);
        __esDecorate(null, null, _tenant_decorators, { kind: "field", name: "tenant", static: false, private: false, access: { has: obj => "tenant" in obj, get: obj => obj.tenant, set: (obj, value) => { obj.tenant = value; } }, metadata: _metadata }, _tenant_initializers, _tenant_extraInitializers);
        __esDecorate(null, null, _resetPasswordToken_decorators, { kind: "field", name: "resetPasswordToken", static: false, private: false, access: { has: obj => "resetPasswordToken" in obj, get: obj => obj.resetPasswordToken, set: (obj, value) => { obj.resetPasswordToken = value; } }, metadata: _metadata }, _resetPasswordToken_initializers, _resetPasswordToken_extraInitializers);
        __esDecorate(null, null, _resetPasswordExpires_decorators, { kind: "field", name: "resetPasswordExpires", static: false, private: false, access: { has: obj => "resetPasswordExpires" in obj, get: obj => obj.resetPasswordExpires, set: (obj, value) => { obj.resetPasswordExpires = value; } }, metadata: _metadata }, _resetPasswordExpires_initializers, _resetPasswordExpires_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UserEntity = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UserEntity = _classThis;
})();
exports.UserEntity = UserEntity;
