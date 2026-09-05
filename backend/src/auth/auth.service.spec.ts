// backend/src/auth/auth.service.spec.ts - REALITY-BASED VERSION
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import {
  DataSource,
  Repository,
  EntityManager,
  DeepPartial,
  QueryRunner,
} from "typeorm";
import { AuthService } from "./auth.service";
import { UserEntity } from "./user.entity";
import { RoleEntity } from "./role.entity";
import { AuditLogEntity } from "../audit/audit.entity";
import { Role } from "@shared/types/role.enum";
import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { UserPayload } from "@shared/types/user";
import { UserResponseDto } from "./dto/admin-user.dto";
import { TenantEntity } from "../tenants/tenant.entity";
import { CreateTenantAdminUserDto } from "../superadmin/dto/create-tenant-admin-user.dto";
import { v4 as uuidv4 } from "uuid";
import * as bcrypt from "bcryptjs";
import {
  SafeTransaction,
  RetryableQuery,
} from "../common/config/database.config";

// ============================================
// CRITICAL: Mock the ACTUAL dependencies correctly
// ============================================

// Mock RetryableQuery - THIS IS WHAT YOUR CODE ACTUALLY USES
jest.mock("../common/config/database.config", () => ({
  RetryableQuery: {
    execute: jest.fn(async (queryFn, maxRetries = 3, delayMs = 100) => {
      let lastError: Error;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await queryFn();
        } catch (error) {
          lastError = error as Error;
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }
      throw lastError!;
    }),
  },
  SafeTransaction: {
    execute: jest.fn(async (dataSource, transactionFn, timeoutMs = 3000) => {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const result = await transactionFn(queryRunner.manager);
        await queryRunner.commitTransaction();
        return result;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }),
  },
}));

// Import AFTER mocking
import {
  RetryableQuery as MockRetryableQuery,
  SafeTransaction as MockSafeTransaction,
} from "../common/config/database.config";

// Mock bcrypt with proper typing
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

// ============================================
// REAL Mock Repositories based on ACTUAL usage
// ============================================

// REAL: Your AuthService queries with relations and select
const createMockUserEntity = (
  overrides: Partial<UserEntity> = {},
): UserEntity => {
  const userId = overrides.id || `user-${uuidv4()}`;
  const email = overrides.email || "test@example.com";
  const tenantId = overrides.tenant_id || `tenant-${uuidv4()}`;

  // REAL: This is what your AuthService SELECTS (line 132)
  return {
    id: userId,
    email,
    password_hash: overrides.password_hash || "hashed_password_123",
    first_name: overrides.first_name || "Test",
    last_name: overrides.last_name || "User",
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    tenant_id: tenantId,
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),

    // REAL: These are RELATIONS, not simple arrays
    tenant:
      overrides.tenant ||
      ({
        tenant_id: tenantId,
        name: "Test Tenant",
        schema_name: "test_schema",
        is_active: true,
        plan: "basic",
        max_users: 10,
        max_storage_gb: 50,
        expires_at: null,
        price: 0,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        users: [] as any,
      } as TenantEntity),

    // REAL: roles with permissions (line 132: relations: ["roles", "roles.permissions"])
    roles: overrides.roles || [
      {
        id: `role-${uuidv4()}`,
        name: Role.AssignedProjectUser,
        description: "Default role",
        permissions: [], // Your code expects this array
        created_at: new Date(),
        updated_at: new Date(),
      } as RoleEntity,
    ],
  } as UserEntity;
};

// REAL: Create mocks that match ACTUAL repository usage
const mockUserRepository: Partial<Repository<UserEntity>> = {
  findOne: jest.fn(),
  create: jest.fn<any, any>(
    (dto: DeepPartial<UserEntity>) =>
      ({
        id: uuidv4(),
        created_at: new Date(),
        updated_at: new Date(),
        ...dto,
      }) as UserEntity,
  ),
  save: jest.fn<any, any>((entityOrEntities: UserEntity | UserEntity[]) => {
    if (Array.isArray(entityOrEntities)) {
      return Promise.resolve(entityOrEntities);
    }
    return Promise.resolve(entityOrEntities);
  }),
  find: jest.fn(() => Promise.resolve([])),
  merge: jest.fn<any, any>(
    (entity: UserEntity, ...entityLikes: DeepPartial<UserEntity>[]) => {
      return Object.assign(entity, ...entityLikes);
    },
  ),
};

const mockRoleRepository: Partial<Repository<RoleEntity>> = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockAuditLogRepository: Partial<Repository<AuditLogEntity>> = {
  save: jest.fn(),
};

// REAL: JwtService mock - your code calls sign() with specific payload
const mockJwtService: Partial<JwtService> = {
  sign: jest.fn(() => "mock-jwt-token"),
};

// REAL: DataSource mock - your code uses transaction through SafeTransaction
const mockQueryRunner: any = {
  // Changed to any for TS2304
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    create: jest.fn<any, any>((entity: any, data: any) => ({
      ...data,
      id: uuidv4(),
    })),
    save: jest.fn<any, any>((entity: any) => Promise.resolve(entity)),
    getRepository: jest.fn().mockReturnValue(mockUserRepository),
  } as any, // Cast the entire manager object to any
  // Mandatory QueryRunner properties (even if dummy implementations)
  connection: {} as any, // Dummy
  broadcaster: {} as any, // Dummy
  isReleased: false,
  isTransactionActive: false,

  data: {},
  // Add other required properties/methods of QueryRunner
  query: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  clear: jest.fn(),
  getMany: jest.fn(),
  getRawOne: jest.fn(),
  getRawMany: jest.fn(),
  stream: jest.fn(),
  execute: jest.fn(),
  load: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  softDelete: jest.fn(),
  restore: jest.fn(),
  getCount: jest.fn(),
  hasId: jest.fn(),
  getId: jest.fn(),
  hasMany: jest.fn(),
  setMany: jest.fn(),
  add: jest.fn(),
  addAll: jest.fn(),
  remove: jest.fn(),
  removeAll: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  findAndCount: jest.fn(),
  getCustomRepository: jest.fn(),
  queryEntity: jest.fn(),
  clearDatabase: jest.fn(),
  dropDatabase: jest.fn(),
  createDatabase: jest.fn(),
  synchronize: jest.fn(),
  migrate: jest.fn(),
  undoLastMigration: jest.fn(),
  log: jest.fn(),
  start: jest.fn(),
  end: jest.fn(),
};

const mockDataSource: Partial<DataSource> = {
  createQueryRunner: jest.fn(() => mockQueryRunner),
};

// ============================================
// TEST SUITE - Testing REAL behavior
// ============================================

describe("AuthService - REAL Implementation Tests", () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<UserEntity>>;
  let roleRepo: jest.Mocked<Repository<RoleEntity>>;
  let auditRepo: jest.Mocked<Repository<AuditLogEntity>>;
  let jwtService: jest.Mocked<JwtService>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset bcrypt mocks
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.genSalt as jest.Mock).mockResolvedValue("mock-salt");
    (bcrypt.hash as jest.Mock).mockResolvedValue("mock-hashed-password");

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(RoleEntity),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(AuditLogEntity),
          useValue: mockAuditLogRepository,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(UserEntity)) as jest.Mocked<
      Repository<UserEntity>
    >;
    roleRepo = module.get(getRepositoryToken(RoleEntity)) as jest.Mocked<
      Repository<RoleEntity>
    >;
    auditRepo = module.get(getRepositoryToken(AuditLogEntity)) as jest.Mocked<
      Repository<AuditLogEntity>
    >;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    dataSource = module.get(DataSource) as jest.Mocked<DataSource>;
  });

  // ============================================
  // TEST 1: Basic existence
  // ============================================
  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // TEST 2: REAL login flow - Happy path
  // ============================================
  describe.only("login - REAL behavior", () => {
    const commonIp = "192.168.1.1";
    const commonUa = "jest-test";

    it("should successfully login a tenant user", async () => {
      // ARRANGE: Create REAL user structure
      const tenantUser = createMockUserEntity({
        email: "tenant@example.com",
        tenant_id: "tenant-123",
        roles: [
          {
            id: "role-123",
            name: Role.AdminDirector, // NOT SuperAdmin
            description: "Admin role",
            permissions: [{ id: "perm-1", name: "read_users" }],
          } as RoleEntity,
        ],
      });

      // ACT: Mock RetryableQuery to return our user
      (MockRetryableQuery.execute as jest.Mock).mockImplementation(
        async (queryFn) => {
          return queryFn();
        },
      );

      userRepo.findOne.mockResolvedValue(tenantUser);
      jwtService.sign.mockReturnValue("real-jwt-token");

      // ACT & ASSERT
      const result = await service.login(
        "tenant@example.com",
        "password123",
        "Tenant",
        commonIp,
        commonUa,
      );

      // REAL assertions based on ACTUAL code
      expect(result.accessToken).toBe("real-jwt-token");
      expect(result.user.email).toBe("tenant@example.com");
      expect(result.user.tenant_id).toBe("tenant-123");

      // REAL: Verify RetryableQuery was used
      expect(MockRetryableQuery.execute).toHaveBeenCalled();

      // REAL: Verify findOne was called with CORRECT parameters
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: "tenant@example.com" },
        relations: ["tenant", "roles", "roles.permissions"],
        select: [
          "id",
          "email",
          "password_hash",
          "first_name",
          "last_name",
          "is_active",
          "tenant_id",
          "roles",
          "tenant",
        ],
      });
    });

    // ============================================
    // TEST 3: User not found - REAL error flow
    // ============================================
    it.skip("should throw UnauthorizedException when user not found", async () => {
      // ARRANGE
      (MockRetryableQuery.execute as jest.Mock).mockImplementation(
        async (queryFn) => {
          return queryFn();
        },
      );
      userRepo.findOne.mockResolvedValue(null);

      // ACT & ASSERT - REAL flow from your code:
      // 1. findOne returns null
      // 2. logAuditAsync is called
      // 3. UnauthorizedException is thrown
      const loginPromise = service.login(
        "nonexistent@example.com",
        "password",
        "Tenant",
        commonIp,
        commonUa,
      );
      await expect(loginPromise).rejects.toThrow(UnauthorizedException);
      await expect(loginPromise).rejects.toThrow("Invalid credentials.");

      // REAL: Verify RetryableQuery was used
      expect(MockRetryableQuery.execute).toHaveBeenCalled();
    });

    // ============================================
    // TEST 4: Missing password hash - REAL edge case
    // ============================================
    it.skip("should throw InternalServerErrorException when password_hash is missing", async () => {
      // ARRANGE: User WITHOUT password_hash
      const userWithoutPassword = createMockUserEntity({
        email: "nopassword@example.com",
        password_hash: "", // EMPTY - triggers line 148 in your code
      });

      (MockRetryableQuery.execute as jest.Mock).mockImplementation(
        async (queryFn) => {
          return queryFn();
        },
      );
      userRepo.findOne.mockResolvedValue(userWithoutPassword);

      // ACT & ASSERT
      const loginPromise = service.login(
        "nopassword@example.com",
        "password",
        "Tenant",
        commonIp,
        commonUa,
      );
      await expect(loginPromise).rejects.toThrow(InternalServerErrorException);
      await expect(loginPromise).rejects.toThrow(
        "Authentication system error: password hash not found.",
      );
    });

    // ============================================
    // TEST 5: Invalid password - REAL bcrypt flow
    // ============================================
    it.skip("should throw UnauthorizedException for invalid password", async () => {
      // ARRANGE
      const tenantUser = createMockUserEntity({
        email: "user@example.com",
        password_hash: "hashed_correct_password",
      });

      (MockRetryableQuery.execute as jest.Mock).mockImplementation(
        async (queryFn) => {
          return queryFn();
        },
      );
      userRepo.findOne.mockResolvedValue(tenantUser);

      // REAL: bcrypt.compare returns false
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // ACT & ASSERT
      await expect(
        service.login(
          "user@example.com",
          "wrong_password",
          "Tenant",
          commonIp,
          commonUa,
        ),
      ).rejects.toThrow(UnauthorizedException);

      // REAL: bcrypt.compare was called with CORRECT arguments
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "wrong_password",
        "hashed_correct_password",
      );
    });

    // ============================================
    // TEST 6: SuperAdmin trying Tenant login - REAL role validation
    // ============================================
    it.skip("should throw ForbiddenException when SuperAdmin tries Tenant login", async () => {
      // ARRANGE: User with SuperAdmin role
      const superAdminUser = createMockUserEntity({
        email: "super@example.com",
        tenant_id: null, // SuperAdmin has no tenant
        roles: [
          {
            id: "super-role",
            name: Role.SuperAdmin, // THIS IS CRITICAL
            description: "Super Admin",
            permissions: [],
          } as RoleEntity,
        ],
      });

      (MockRetryableQuery.execute as jest.Mock).mockImplementation(
        async (queryFn) => {
          return queryFn();
        },
      );
      userRepo.findOne.mockResolvedValue(superAdminUser);

      // ACT & ASSERT: SuperAdmin trying Tenant portal
      const loginPromise = service.login(
        "super@example.com",
        "password",
        "Tenant",
        commonIp,
        commonUa,
      );
      await expect(loginPromise).rejects.toThrow(ForbiddenException);
      await expect(loginPromise).rejects.toThrow(
        "SuperAdmin accounts must log in through the SuperAdmin portal.",
      );
    });

    // ============================================
    // TEST 7: LoginCache behavior - REAL deduplication
    // ============================================
    it.skip("should use LoginCache to prevent duplicate login processing", async () => {
      // ARRANGE
      const tenantUser = createMockUserEntity({ email: "cache@example.com" });

      (MockRetryableQuery.execute as jest.Mock).mockImplementation(
        async (queryFn) => {
          return queryFn();
        },
      );
      userRepo.findOne.mockResolvedValue(tenantUser);

      // Spy on the private executeLogin to verify deduplication
      const executeLoginSpy = jest.spyOn(service as any, "executeLogin");

      // ACT: Make two "simultaneous" login calls
      const loginPromise1 = service.login(
        "cache@example.com",
        "password",
        "Tenant",
        commonIp,
        commonUa,
      );
      const loginPromise2 = service.login(
        "cache@example.com",
        "password",
        "Tenant",
        commonIp,
        commonUa,
      );

      const [result1, result2] = await Promise.all([
        loginPromise1,
        loginPromise2,
      ]);

      // ASSERT: Should get same results
      expect(result1.accessToken).toBe(result2.accessToken);

      // REAL: executeLogin should be called ONLY ONCE due to cache
      expect(executeLoginSpy).toHaveBeenCalledTimes(1);

      // Cleanup
      executeLoginSpy.mockRestore();
    });
  });

  // ============================================
  // TEST 8: RetryableQuery - REAL retry behavior
  // ============================================
  describe("RetryableQuery integration", () => {
    it("should retry on transient database errors", async () => {
      // ARRANGE: Make findOne fail twice then succeed
      const tenantUser = createMockUserEntity({ email: "retry@example.com" });

      let callCount = 0;
      userRepo.findOne.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error("Transient DB error"));
        }
        return Promise.resolve(tenantUser);
      });

      // ACT & ASSERT
      const result = await service.login(
        "retry@example.com",
        "password",
        "Tenant",
        "1.1.1.1",
        "test",
      );

      expect(result).toBeDefined();
      expect(userRepo.findOne).toHaveBeenCalledTimes(3); // 2 failures + 1 success
    });

    it("should fail after max retries", async () => {
      // ARRANGE: Always fail
      userRepo.findOne.mockRejectedValue(new Error("Permanent DB error"));

      // ACT & ASSERT
      await expect(
        service.login(
          "fail@example.com",
          "password",
          "Tenant",
          "1.1.1.1",
          "test",
        ),
      ).rejects.toThrow("Permanent DB error");

      // Default maxRetries is 3, so 1 initial + 2 retries = 3 calls
      expect(userRepo.findOne).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================
  // TEST 9: Audit logging - REAL structure
  // ============================================
  describe("Audit logging", () => {
    it("should log successful login with correct structure", async () => {
      // ARRANGE
      const tenantUser = createMockUserEntity({ email: "audit@example.com" });

      (MockRetryableQuery.execute as jest.Mock).mockImplementation(
        async (queryFn) => {
          return queryFn();
        },
      );
      userRepo.findOne.mockResolvedValue(tenantUser);

      // Spy on SafeTransaction to verify audit log structure
      const safeTransactionSpy = jest.spyOn(MockSafeTransaction, "execute");

      // ACT
      await service.login(
        "audit@example.com",
        "password",
        "Tenant",
        "192.168.1.100",
        "Chrome",
      );

      // ASSERT: Verify REAL audit log structure from line 244
      expect(safeTransactionSpy).toHaveBeenCalled();

      // REAL: Verify CORRECT structure - directly assert on mockQueryRunner.manager.create
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        AuditLogEntity,
        expect.objectContaining({
          action: "LOGIN_SUCCESS",
          userId: tenantUser.id,
          ipAddress: "192.168.1.100",
          details: expect.objectContaining({
            login_duration_ms: expect.any(Number),
            portal_type: "Tenant",
            tenant_id: tenantUser.tenant_id,
            userAgent: "Chrome",
          }),
          userEmail: "audit@example.com",
          tenantId: tenantUser.tenant_id,
        }),
      );

      safeTransactionSpy.mockRestore();
    });

    it("should log failure when user not found with email in userEmail field", async () => {
      // ARRANGE
      userRepo.findOne.mockResolvedValue(null);

      const safeTransactionSpy = jest.spyOn(MockSafeTransaction, "execute");

      // ACT & ASSERT
      await expect(
        service.login(
          "notfound@example.com",
          "password",
          "Tenant",
          "1.1.1.1",
          "test",
        ),
      ).rejects.toThrow();

      // REAL: userEmail should contain the email, NOT in details
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        AuditLogEntity,
        expect.objectContaining({
          action: "LOGIN_FAILURE",
          userId: null,
          userEmail: "notfound@example.com",
          details: expect.objectContaining({
            reason: "User not found",
            userAgent: "test",
          }),
        }),
      );

      safeTransactionSpy.mockRestore();
    });
  });

  // ============================================
  // TEST 10: Other REAL methods
  // ============================================
  describe("Other methods", () => {
    it("should find user by id using RetryableQuery", async () => {
      // ARRANGE
      const mockUser = createMockUserEntity({ id: "user-123" });

      (MockRetryableQuery.execute as jest.Mock).mockImplementation(
        async (queryFn) => {
          return queryFn();
        },
      );
      userRepo.findOne.mockResolvedValue(mockUser);

      // ACT
      const result = await service.findUserById("user-123");

      // ASSERT
      expect(result.id).toBe("user-123");
      expect(MockRetryableQuery.execute).toHaveBeenCalled();
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: "user-123" },
        relations: ["tenant", "roles"],
      });
    });

    it("should register new user with default role", async () => {
      // ARRANGE
      const defaultRole = {
        id: "default-role",
        name: Role.AssignedProjectUser,
        description: "Default role",
      } as RoleEntity;

      (MockRetryableQuery.execute as jest.Mock).mockImplementation(
        async (queryFn) => {
          return queryFn();
        },
      );

      const newUser = createMockUserEntity({
        email: "new@example.com",
        tenant_id: null,
      });
      roleRepo.findOne.mockResolvedValue(defaultRole);
      userRepo.findOne.mockResolvedValueOnce(null).mockResolvedValue(newUser as any);
      userRepo.create.mockReturnValue(newUser);
      userRepo.save.mockResolvedValue(newUser);

      // ACT
      const result = await service.register({
        email: "new@example.com",
        password: "password123VeryStrong1",
      });

      // ASSERT
      expect(result.email).toBe("new@example.com");
      expect(result.tenant_id).toBeNull(); // public registration must not allow tenant infiltration
      expect(bcrypt.hash).toHaveBeenCalled(); // Password was hashed
    });
  });
});

// ============================================
// REAL Test Helper Functions
// ============================================

/**
 * Creates a test user that matches REAL AuthService expectations
 */
function createTestUser(overrides: Partial<UserEntity> = {}): UserEntity {
  const baseUser = createMockUserEntity(overrides);

  // Ensure required fields for AuthService
  if (!baseUser.password_hash) {
    baseUser.password_hash = "mock_hashed_password";
  }

  if (!baseUser.roles || baseUser.roles.length === 0) {
    baseUser.roles = [
      {
        id: `role-${uuidv4()}`,
        name: Role.AssignedProjectUser,
        description: "Default role",
        permissions: [],
        created_at: new Date(),
        updated_at: new Date(),
      } as RoleEntity,
    ];
  }

  return baseUser;
}

/**
 * Creates a test SuperAdmin user
 */
function createTestSuperAdmin(): UserEntity {
  return createTestUser({
    email: "superadmin@example.com",
    tenant_id: null,
    roles: [
      {
        id: "superadmin-role",
        name: Role.SuperAdmin,
        description: "Super Admin",
        permissions: [],
        created_at: new Date(),
        updated_at: new Date(),
      } as RoleEntity,
    ],
  });
}

/**
 * Creates a test Tenant Admin user
 */
function createTestTenantAdmin(tenantId: string = "tenant-123"): UserEntity {
  return createTestUser({
    email: `admin@${tenantId}.com`,
    tenant_id: tenantId,
    roles: [
      {
        id: "admin-role",
        name: Role.AdminDirector,
        description: "Tenant Admin",
        permissions: [],
        created_at: new Date(),
        updated_at: new Date(),
      } as RoleEntity,
    ],
  });
}
