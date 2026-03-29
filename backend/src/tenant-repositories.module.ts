import { Global, Module, Provider, Scope } from "@nestjs/common";
import { DataSource } from "typeorm";
import { TENANT_DATA_SOURCE } from "./database/constants"; // Corrected import path
import { UserEntity } from "./auth/user.entity";
import { RoleEntity } from "./auth/role.entity";
import { PermissionEntity } from "./auth/permission.entity";
import { AuditLogEntity } from "./audit/audit.entity";

// Define tokens for injection
export const TENANT_USER_REPOSITORY = "TENANT_USER_REPOSITORY";
export const TENANT_ROLE_REPOSITORY = "TENANT_ROLE_REPOSITORY";
export const TENANT_PERMISSION_REPOSITORY = "TENANT_PERMISSION_REPOSITORY";
export const TENANT_AUDIT_LOG_REPOSITORY = "TENANT_AUDIT_LOG_REPOSITORY";

const userRepositoryProvider: Provider = {
  provide: TENANT_USER_REPOSITORY,
  scope: Scope.REQUEST,
  useFactory: (dataSource: DataSource) => dataSource.getRepository(UserEntity),
  inject: [TENANT_DATA_SOURCE],
};

const roleRepositoryProvider: Provider = {
  provide: TENANT_ROLE_REPOSITORY,
  scope: Scope.REQUEST,
  useFactory: (dataSource: DataSource) => dataSource.getRepository(RoleEntity),
  inject: [TENANT_DATA_SOURCE],
};

const permissionRepositoryProvider: Provider = {
  provide: TENANT_PERMISSION_REPOSITORY,
  scope: Scope.REQUEST,
  useFactory: (dataSource: DataSource) =>
    dataSource.getRepository(PermissionEntity),
  inject: [TENANT_DATA_SOURCE],
};

const auditLogRepositoryProvider: Provider = {
  provide: TENANT_AUDIT_LOG_REPOSITORY,
  scope: Scope.REQUEST,
  useFactory: (dataSource: DataSource) =>
    dataSource.getRepository(AuditLogEntity),
  inject: [TENANT_DATA_SOURCE],
};

@Global()
@Module({
  providers: [
    userRepositoryProvider,
    roleRepositoryProvider,
    permissionRepositoryProvider,
    auditLogRepositoryProvider,
  ],
  exports: [
    TENANT_USER_REPOSITORY,
    TENANT_ROLE_REPOSITORY,
    TENANT_PERMISSION_REPOSITORY,
    TENANT_AUDIT_LOG_REPOSITORY,
  ],
})
export class TenantRepositoriesModule {}
