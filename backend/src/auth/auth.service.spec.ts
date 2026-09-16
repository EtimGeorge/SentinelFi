import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { DataSource } from "typeorm";
import { AuthService } from "./auth.service";
import { UserEntity } from "./user.entity";
import { RoleEntity } from "./role.entity";
import { AuditLogEntity } from "../audit/audit.entity";
import { Role } from "@shared/types/role.enum";
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { AuditService } from "../audit/audit.service";
import { InvitationService } from "./invitation.service";
import { TokenBlacklistService } from "./token-blacklist.service";
import { EmailService } from "../email/email.service";
import { IAuthCache } from "./auth-cache";

// ------------------------------------------------------------------
// Module mocks
// ------------------------------------------------------------------
jest.mock("../common/config/database.config", () => ({
  RetryableQuery: {
    execute: jest.fn(async (queryFn: () => any) => queryFn()),
  },
  SafeTransaction: {
    execute: jest.fn(async (ds: any, fn: any) => {
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        const result = await fn(qr.manager);
        await qr.commitTransaction();
        return result;
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }
    }),
  },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue("salt"),
  hash: jest.fn().mockResolvedValue("hashed"),
}));

jest.mock("../common/logger/correlated-logger", () => ({
  CorrelatedLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock("../common/interceptors/correlation.interceptor", () => ({
  getCorrelationId: () => "test-cid",
}));

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function qbChain() {
  const q: any = {};
  [
    "addSelect",
    "leftJoinAndSelect",
    "where",
    "andWhere",
    "select",
    "getOne",
  ].forEach((m) => {
    q[m] = jest.fn().mockReturnValue(q);
  });
  return q;
}

const tenantUser = {
  id: "u1",
  email: "user@test.com",
  username: "user",
  password_hash: "hashed",
  first_name: "Test",
  last_name: "User",
  is_active: true,
  tenant_id: "t1",
  mfa_enabled: false,
  token_version: 0,
  tenant: { tenant_id: "t1", name: "Tenant One" },
  roles: [
    {
      id: "r1",
      name: Role.AssignedProjectUser,
      permissions: [{ name: "read" }],
    },
  ],
} as any;

const superAdminUser = {
  ...tenantUser,
  id: "u2",
  email: "super@test.com",
  tenant_id: null,
  tenant: null,
  mfa_enabled: false,
  roles: [{ id: "r2", name: Role.SuperAdmin, permissions: [] }],
} as any;

// ------------------------------------------------------------------
// Suite
// ------------------------------------------------------------------
describe("AuthService", () => {
  let service: AuthService;
  let jwtService: JwtService;
  let dataSource: jest.Mocked<DataSource>;
  let auditService: jest.Mocked<AuditService>;
  let userQueryBuilder: any;
  let userRepo: any;
  let roleRepo: any;
  let bcrypt: typeof import("bcryptjs");

  beforeEach(async () => {
    jest.clearAllMocks();

    userQueryBuilder = qbChain();
    userRepo = {
      createQueryBuilder: jest.fn(() => userQueryBuilder),
      findOne: jest.fn(),
      create: jest.fn((d: any) => ({ id: "created", ...d })),
      save: jest.fn((e: any) => Promise.resolve(e)),
    };
    roleRepo = {
      findOne: jest.fn(),
    };

    const mockDataSource: any = {
      getRepository: jest.fn((entity: any) => {
        if (entity === UserEntity || entity?.name === "UserEntity") return userRepo;
        if (entity === RoleEntity || entity?.name === "RoleEntity") return roleRepo;
        return { findOne: jest.fn() };
      }),
      createQueryRunner: jest.fn(() => ({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: { create: jest.fn(), save: jest.fn() },
      })),
    };

    auditService = { log: jest.fn().mockResolvedValue(undefined) } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue("signed-token"),
            signAsync: jest.fn().mockResolvedValue("signed-token"),
          },
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: TENANT_DATA_SOURCE, useValue: mockDataSource },
        { provide: AuditService, useValue: auditService },
        { provide: InvitationService, useValue: {} },
        {
          provide: TokenBlacklistService,
          useValue: { blacklist: jest.fn(), isBlacklisted: jest.fn().mockReturnValue(false) },
        },
        { provide: EmailService, useValue: {} },
        {
          provide: "IAuthCache" as unknown as string,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
          } as IAuthCache,
        },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(RoleEntity), useValue: roleRepo },
        { provide: getRepositoryToken(AuditLogEntity), useValue: { save: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
    dataSource = module.get(DataSource);
    bcrypt = require("bcryptjs");
    // clearAllMocks() does NOT reset mock implementations — the "invalid
    // password" test sets compare→false, which would otherwise leak into
    // later tests. Re-establish the default (password valid) each time.
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -----------------------------------------------------------------
  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // =================================================================
  // login
  // =================================================================
  describe("login", () => {
    it("returns an access token on successful tenant login", async () => {
      userQueryBuilder.getOne.mockResolvedValue(tenantUser);

      const result = (await service.login(
        tenantUser.email,
        "password",
        "Tenant",
        "10.0.0.1",
        "jest-agent",
      )) as { accessToken: string; user: any };

      expect(result.accessToken).toBe("signed-token");
      expect(result.user.email).toBe(tenantUser.email);
      expect(result.user.tenant_id).toBe(tenantUser.tenant_id);

      expect(auditService.log).toHaveBeenCalledWith(
        tenantUser.id,
        "LOGIN_SUCCESS",
        tenantUser.tenant_id,
        expect.any(String),
        expect.objectContaining({ portal_type: "Tenant" }),
        tenantUser.email,
        "10.0.0.1",
        "jest-agent",
      );
    });

    it("throws UnauthorizedException when user is not found", async () => {
      userQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.login("none@test.com", "pw", "Tenant", "1.1.1.1", "t"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when user account is inactive", async () => {
      userQueryBuilder.getOne.mockResolvedValue({ ...tenantUser, is_active: false });

      await expect(
        service.login(tenantUser.email, "pw", "Tenant", "1.1.1.1", "t"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException on invalid password", async () => {
      userQueryBuilder.getOne.mockResolvedValue(tenantUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login(tenantUser.email, "wrong", "Tenant", "1.1.1.1", "t"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws ForbiddenException when SuperAdmin attempts Tenant login", async () => {
      userQueryBuilder.getOne.mockResolvedValue(superAdminUser);

      await expect(
        service.login(superAdminUser.email, "pw", "Tenant", "1.1.1.1", "t"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("returns requiresMFA challenge for SuperAdmin with MFA enabled", async () => {
      const mfaUser = {
        ...superAdminUser,
        mfa_enabled: true,
        token_version: 0,
      };
      userQueryBuilder.getOne.mockResolvedValue(mfaUser);

      const result = await service.login(
        mfaUser.email,
        "pw",
        "SuperAdmin",
        "1.1.1.1",
        "t",
      );

      expect(result).toEqual({ requiresMFA: true, mfaToken: "signed-token" });
      expect(jwtService.sign).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.any(String),
        "LOGIN_MFA_CHALLENGE",
        null,
        expect.any(String),
        expect.objectContaining({ portal_type: "SuperAdmin" }),
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
    });
  });

  // =================================================================
  // login deduplication
  // =================================================================
  describe("login deduplication", () => {
    it("reuses the same promise for identical concurrent calls", async () => {
      userQueryBuilder.getOne.mockResolvedValue(tenantUser);

      const p1 = service.login(tenantUser.email, "pw", "Tenant", "1.1.1.1", "t");
      const p2 = service.login(tenantUser.email, "pw", "Tenant", "1.1.1.1", "t");

      const [r1, r2] = await Promise.all([p1, p2]);

      expect((r1 as any).accessToken).toBe((r2 as any).accessToken);
      // getOne called only once for the shared executeLogin call
      expect(userQueryBuilder.getOne).toHaveBeenCalledTimes(1);
    });
  });

  // =================================================================
  // register
  // =================================================================
  describe("register", () => {
    it("creates a new user with the default AssignedProjectUser role", async () => {
      userRepo.findOne
        .mockResolvedValueOnce(null) // existing user check
        .mockResolvedValueOnce({      // findUserById inside register
          id: "created",
          email: "new@test.com",
          username: "new",
          first_name: null,
          last_name: null,
          is_active: true,
          tenant_id: null,
          tenant: null,
          roles: [{ name: Role.AssignedProjectUser, permissions: [] }],
        });
      roleRepo.findOne.mockResolvedValue({
        id: "default-role",
        name: Role.AssignedProjectUser,
      });

      const result = await service.register({
        email: "new@test.com",
        password: "StrongP@ss1",
      } as any);

      expect(result.email).toBe("new@test.com");
      expect(result.tenant_id).toBeNull();
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.any(String),
        "USER_REGISTERED",
        null,
        expect.any(String),
        {},
        "new@test.com",
      );
    });

    it("throws ConflictException when email already exists", async () => {
      userRepo.findOne.mockResolvedValue({ id: "existing" } as any);

      await expect(
        service.register({ email: "dup@test.com", password: "P@ss1" } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  // =================================================================
  // findUserById
  // =================================================================
  describe("findUserById", () => {
    it("returns the user when found", async () => {
      userRepo.findOne.mockResolvedValue({
        id: "abc",
        email: "a@b.com",
        tenant_id: "t1",
        roles: [],
        tenant: null,
      } as any);

      const result = await service.findUserById("abc");
      expect(result.id).toBe("abc");
    });

    it("throws NotFoundException when user does not exist", async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.findUserById("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
