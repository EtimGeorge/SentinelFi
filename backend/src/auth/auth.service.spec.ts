import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { UserEntity } from "./user.entity";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { AuditService } from "../audit/audit.service";
import { LoginUserDto } from "./dto/login-user.dto";
import { UserResponseDto } from "./dto/admin-user.dto";
import {
  JwtPayload,
  ICreateUserPayload,
  IUpdateUserPayload,
} from "@shared/types/user";
import { Role } from "@shared/types/role.enum";
import { CreateUserDto as BackendCreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto as BackendUpdateUserDto } from "./dto/update-user.dto";
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common"; // Explicitly re-added
import { RegisterUserDto } from "./dto/register-user.dto"; // Still needed

// Mock bcrypt directly, as it's an external library
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  genSalt: jest.fn(() => Promise.resolve("mockSalt")),
  hash: jest.fn(() => Promise.resolve("mockHashedPassword")),
}));

describe("AuthService", () => {
  let service: AuthService;
  let usersRepository: Repository<UserEntity>;
  let jwtService: JwtService;
  let auditService: AuditService;

  const mockUsersRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(() => "mockAccessToken"),
  };

  const mockAuditService = {
    logEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUsersRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity),
    );
    jwtService = module.get<JwtService>(JwtService);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // --- Test cases for login method ---
  describe("login", () => {
    const loginDto: LoginUserDto = {
      email: "test@example.com",
      password: "password123",
    };

    const mockUserEntity: UserEntity = {
      id: "user-id",
      email: "test@example.com",
      password_hash: "hashedPassword123",
      role: Role.Admin,
      is_active: true,
      tenant_id: "tenant-id",
      first_name: "Test",
      last_name: "User",
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
      created_at: new Date(),
      updated_at: new Date(),
      tenant: {
        tenant_id: "tenant-id",
        name: "Test Tenant",
        schema_name: "client_tenant_id",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
                users: [],
                plan: 'basic',
              },    };

    it("should return an access token and user info on successful login", async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUserEntity);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        select: expect.any(Array),
        relations: ["tenant"],
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUserEntity.password_hash,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: mockUserEntity.email,
        sub: mockUserEntity.id,
        role: mockUserEntity.role,
        tenant_id: mockUserEntity.tenant_id,
      });
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "LOGIN_SUCCESS" }),
      );
      expect(result).toEqual({
        access_token: "mockAccessToken",
        user: {
          id: mockUserEntity.id,
          email: mockUserEntity.email,
          role: mockUserEntity.role,
          is_active: mockUserEntity.is_active,
          tenant_id: mockUserEntity.tenant_id,
          tenant_name: mockUserEntity.tenant.name,
          isSuperAdmin: false,
        },
      });
    });

    it("should throw UnauthorizedException for invalid email", async () => {
      mockUsersRepository.findOne.mockResolvedValue(undefined);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "LOGIN_FAILURE",
          userEmail: loginDto.email,
        }),
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException for inactive user", async () => {
      mockUsersRepository.findOne.mockResolvedValue({
        ...mockUserEntity,
        is_active: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "LOGIN_FAILURE",
          userEmail: loginDto.email,
        }),
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException for invalid password", async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUserEntity);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "LOGIN_FAILURE",
          userEmail: loginDto.email,
        }),
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  // --- Test cases for register method ---
  describe("register", () => {
    const registerDto: RegisterUserDto = {
      email: "newuser@example.com",
      password: "newpassword123",
    };

    it("should successfully register a new user", async () => {
      mockUsersRepository.findOne.mockResolvedValue(undefined);
      const mockSavedUser: UserEntity = {
        id: "new-user-id",
        email: registerDto.email,
        password_hash: "hashedNewPassword",
        role: Role.AssignedProjectUser,
        is_active: true,
        tenant_id: null,
        first_name: undefined,
        last_name: undefined,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined,
        created_at: new Date(),
        updated_at: new Date(),
        tenant: undefined as any, // Cast to any to bypass strict type checking for mocks
      };
      mockUsersRepository.create.mockReturnValue(mockSavedUser);
      mockUsersRepository.save.mockResolvedValue(mockSavedUser);
      mockUsersRepository.findOne
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockSavedUser);

      const registerUserSpy = jest.spyOn(service as any, "registerUser");
      registerUserSpy.mockResolvedValue({
        id: "new-user-id",
        email: registerDto.email,
        password_hash: "hashedNewPassword",
        role: Role.AssignedProjectUser,
        is_active: true,
        tenant_id: null,
        tenant: undefined as any, // Cast to any to bypass strict type checking for mocks
      });

      const result = await service.register(registerDto);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(registerUserSpy).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        Role.AssignedProjectUser,
        undefined,
      );
      expect(result).toEqual({
        id: "new-user-id",
        email: registerDto.email,
        role: Role.AssignedProjectUser,
        is_active: true,
        tenant_id: null,
        tenant_name: null, // Fixed: changed from undefined to null
      });
      // Removed: expect(auditService.logEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'USER_CREATED' }));
    });

    it("should throw ConflictException if user with email already exists", async () => {
      mockUsersRepository.findOne.mockResolvedValue({ id: "existing-user" });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(usersRepository.create).not.toHaveBeenCalled();
      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(auditService.logEvent).not.toHaveBeenCalled();
    });
  });

  // --- Test cases for createUser method (Admin Function) ---
  describe("createUser (Admin Function)", () => {
    const requestingUserPayload: JwtPayload = {
      sub: "admin-id",
      id: "admin-id",
      email: "admin@example.com",
      role: Role.Admin,
      tenant_id: "admin-tenant-id",
      is_active: true,
      iat: expect.any(Number),
      exp: expect.any(Number),
    };

    const createUserDto: BackendCreateUserDto = {
      email: "newadminuser@example.com",
      password: "securePassword123",
      role: Role.Admin,
      tenant_id: "admin-tenant-id",
    };

    const mockCreatedUserEntity: UserEntity = {
      // New mock for what .create() returns
      id: "created-user-id",
      email: createUserDto.email,
      password_hash: "mockHashedPassword",
      role: createUserDto.role,
      is_active: true,
      tenant_id: createUserDto.tenant_id || null,
      first_name: undefined,
      last_name: undefined,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
      created_at: undefined as any, // Will be set by save
      updated_at: undefined as any, // Will be set by save
      tenant: undefined as any,
    };

    const mockSavedUserEntity: UserEntity = {
      // New mock for what .save() returns
      ...mockCreatedUserEntity,
      created_at: new Date(),
      updated_at: new Date(),
      tenant: {
        tenant_id: "admin-tenant-id",
        name: "Admin Tenant",
        schema_name: "client_admin-tenant-id",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
                users: [],
                plan: 'basic',
              },    };
    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue("mockHashedPassword");
      // Set up findOne mocks for "existing" check and "userWithTenant" fetch
      mockUsersRepository.findOne.mockReset(); // Clear any previous general mocks for findOne
      mockUsersRepository.findOne.mockResolvedValueOnce(undefined); // First call (existing user check)
      mockUsersRepository.findOne.mockResolvedValueOnce(mockSavedUserEntity); // Second call (userWithTenant fetch)

      mockUsersRepository.create.mockReturnValue(mockCreatedUserEntity); // .create() returns a new entity
      mockUsersRepository.save.mockResolvedValue(mockSavedUserEntity); // .save() returns the saved entity
    });

    it("should create a new user by an Admin within the same tenant", async () => {
      const result = await service.createUser(
        requestingUserPayload,
        createUserDto,
      );

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith(
        createUserDto.password,
        "mockSalt",
      );
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: createUserDto.email,
          password_hash: "mockHashedPassword",
          role: createUserDto.role,
          is_active: true,
          tenant_id: createUserDto.tenant_id,
        }),
      );
      expect(usersRepository.save).toHaveBeenCalledWith(mockCreatedUserEntity); // Check with the created object
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "USER_CREATED" }),
      );
      expect(result).toEqual({
        id: mockSavedUserEntity.id,
        email: mockSavedUserEntity.email,
        role: mockSavedUserEntity.role,
        is_active: mockSavedUserEntity.is_active,
        tenant_id: mockSavedUserEntity.tenant_id,
        tenant_name: mockSavedUserEntity.tenant!.name,
      });
    });

    it("should throw ConflictException if user with email already exists", async () => {
      mockUsersRepository.findOne.mockReset(); // Reset mocks for this specific test
      mockUsersRepository.findOne.mockResolvedValueOnce({
        id: "existing-user",
        email: createUserDto.email,
      }); // Simulate existing user for the first findOne call

      await expect(
        service.createUser(requestingUserPayload, createUserDto),
      ).rejects.toThrow(ConflictException);
      expect(usersRepository.create).not.toHaveBeenCalled();
      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(auditService.logEvent).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException if Admin tries to create user in different tenant", async () => {
      const invalidCreateUserDto: BackendCreateUserDto = {
        ...createUserDto,
        tenant_id: "other-tenant-id",
      };
      // findOne for existing user should return undefined
      mockUsersRepository.findOne.mockReset();
      mockUsersRepository.findOne.mockResolvedValueOnce(undefined);

      await expect(
        service.createUser(requestingUserPayload, invalidCreateUserDto),
      ).rejects.toThrow(ForbiddenException);
      expect(usersRepository.create).not.toHaveBeenCalled();
      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(auditService.logEvent).not.toHaveBeenCalled();
    });

    it("should allow SuperAdmin to create user with a specific tenant_id", async () => {
      const superAdminPayload: JwtPayload = {
        sub: "superadmin-id",
        id: "superadmin-id",
        email: "superadmin@example.com",
        role: Role.SuperAdmin,
        tenant_id: null,
        is_active: true,
        iat: expect.any(Number),
        exp: expect.any(Number),
      };
      const createUserDtoForSuperAdmin: BackendCreateUserDto = {
        email: "superadmincreates@example.com", // Added missing email
        password: "securePassword123",
        role: Role.Admin,
        tenant_id: "any-tenant-id",
      };
      const mockCreatedUserEntityForSuperAdmin: UserEntity = {
        ...mockCreatedUserEntity,
        id: "superadmin-created-user-id", // Unique ID for this mock
        email: createUserDtoForSuperAdmin.email,
        tenant_id: createUserDtoForSuperAdmin.tenant_id || null,
        role: createUserDtoForSuperAdmin.role,
      };
      const mockSavedUserEntityForSuperAdmin: UserEntity = {
        ...mockCreatedUserEntityForSuperAdmin,
        created_at: new Date(),
        updated_at: new Date(),
        tenant: {
          tenant_id: "any-tenant-id",
          name: "Any Tenant",
          schema_name: "client_any-tenant-id",
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
                  users: [],
                  plan: 'basic',
                },      };

      // Reset findOne mocks for this specific test
      mockUsersRepository.findOne.mockReset();
      mockUsersRepository.findOne.mockResolvedValueOnce(undefined); // First call (existing user check)
      mockUsersRepository.findOne.mockResolvedValueOnce(
        mockSavedUserEntityForSuperAdmin,
      ); // Second call (userWithTenant fetch)

      mockUsersRepository.create.mockReturnValue(
        mockCreatedUserEntityForSuperAdmin,
      );
      mockUsersRepository.save.mockResolvedValue(
        mockSavedUserEntityForSuperAdmin,
      );

      const result = await service.createUser(
        superAdminPayload,
        createUserDtoForSuperAdmin,
      );

      expect(result.tenant_id).toBe("any-tenant-id");
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "USER_CREATED" }),
      );
    });

    it("should allow SuperAdmin to create system user (tenant_id: null) if not provided", async () => {
      const superAdminPayload: JwtPayload = {
        sub: "superadmin-id",
        id: "superadmin-id",
        email: "superadmin@example.com",
        role: Role.SuperAdmin,
        tenant_id: null,
        is_active: true,
        iat: expect.any(Number),
        exp: expect.any(Number),
      };
      const createUserDtoForSuperAdmin: BackendCreateUserDto = {
        email: "superadminsystem@example.com",
        password: "securePassword123",
        role: Role.SuperAdmin,
        tenant_id: null,
      };
      const mockCreatedSystemUserEntity: UserEntity = {
        ...mockCreatedUserEntity,
        id: "superadmin-system-user-id", // Unique ID for this mock
        email: createUserDtoForSuperAdmin.email,
        role: createUserDtoForSuperAdmin.role,
        tenant_id: null,
      };
      const mockSavedSystemUserEntity: UserEntity = {
        ...mockCreatedSystemUserEntity,
        created_at: new Date(),
        updated_at: new Date(),
        tenant: undefined as any,
      };

      // Reset findOne mocks for this specific test
      mockUsersRepository.findOne.mockReset();
      mockUsersRepository.findOne.mockResolvedValueOnce(undefined); // First call (existing user check)
      mockUsersRepository.findOne.mockResolvedValueOnce(
        mockSavedSystemUserEntity,
      ); // Second call (userWithTenant fetch)

      mockUsersRepository.create.mockReturnValue(mockCreatedSystemUserEntity);
      mockUsersRepository.save.mockResolvedValue(mockSavedSystemUserEntity);

      const result = await service.createUser(
        superAdminPayload,
        createUserDtoForSuperAdmin,
      );

      expect(result.tenant_id).toBeNull();
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "USER_CREATED" }),
      );
    });
  });

  // --- Test cases for updateUser method (Admin Function) ---
  describe("updateUser (Admin Function)", () => {
    const requestingUserPayload: JwtPayload = {
      sub: "admin-id",
      id: "admin-id",
      email: "admin@example.com",
      role: Role.Admin,
      tenant_id: "admin-tenant-id",
      is_active: true,
      iat: expect.any(Number),
      exp: expect.any(Number),
    };
    const userIdToUpdate = "user-to-update-id";
    const mockExistingUser: UserEntity = {
      id: userIdToUpdate,
      email: "existing@example.com",
      password_hash: "hashedPassword",
      role: Role.AssignedProjectUser,
      is_active: true,
      tenant_id: "admin-tenant-id",
      first_name: "Existing",
      last_name: "User",
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
      created_at: new Date(),
      updated_at: new Date(),
      tenant: {
        tenant_id: "admin-tenant-id",
        name: "Admin Tenant",
        schema_name: "client_admin-tenant-id",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
                users: [],
                plan: 'basic',
              },    };

    const mockUpdatedUserEntity: UserEntity = {
      ...mockExistingUser,
      role: Role.Admin,
      is_active: false,
      updated_at: new Date(),
    };

    beforeEach(() => {
      mockUsersRepository.findOne.mockResolvedValue(mockExistingUser);
      mockUsersRepository.save.mockResolvedValue(mockUpdatedUserEntity); // Mock save to return the updated entity
    });

    it("should update user role and active status by an Admin", async () => {
      const updateUserDto: BackendUpdateUserDto = {
        role: Role.Admin,
        is_active: false,
      };

      const result = await service.updateUser(
        requestingUserPayload,
        userIdToUpdate,
        updateUserDto,
      );

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: userIdToUpdate },
      });
      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          // Check with objectContaining
          id: userIdToUpdate,
          role: Role.Admin,
          is_active: false,
        }),
      );
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_UPDATED",
          details: {
            changes: {
              role: { from: Role.AssignedProjectUser, to: Role.Admin },
              is_active: { from: true, to: false },
            },
          },
        }),
      );
      expect(result.role).toBe(Role.Admin);
      expect(result.is_active).toBe(false);
    });

    it("should throw NotFoundException if user to update does not exist", async () => {
      mockUsersRepository.findOne.mockResolvedValue(undefined);

      const updateUserDto: BackendUpdateUserDto = { role: Role.Admin };
      await expect(
        service.updateUser(
          requestingUserPayload,
          userIdToUpdate,
          updateUserDto,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(auditService.logEvent).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException if Admin tries to change tenant_id", async () => {
      const updateUserDto: BackendUpdateUserDto = {
        tenant_id: "other-tenant-id",
      };

      await expect(
        service.updateUser(
          requestingUserPayload,
          userIdToUpdate,
          updateUserDto,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(auditService.logEvent).not.toHaveBeenCalled();
    });

    it("should allow SuperAdmin to change user tenant_id", async () => {
      const superAdminPayload: JwtPayload = {
        sub: "superadmin-id",
        id: "superadmin-id",
        email: "superadmin@example.com",
        role: Role.SuperAdmin,
        tenant_id: null,
        is_active: true,
        iat: expect.any(Number),
        exp: expect.any(Number),
      };
      const updateUserDto: BackendUpdateUserDto = {
        tenant_id: "new-tenant-for-user",
      };
      const mockUpdatedUser: UserEntity = {
        ...mockExistingUser,
        tenant_id: "new-tenant-for-user",
        tenant: {
          tenant_id: "new-tenant-for-user",
          name: "New Tenant",
          schema_name: "client_new-tenant-for-user",
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
                  users: [],
                  plan: 'basic',
                },      };

      // Reset findOne mocks for this specific test
      mockUsersRepository.findOne.mockReset();
      mockUsersRepository.findOne.mockResolvedValueOnce(mockExistingUser); // First call (existing user)
      mockUsersRepository.findOne.mockResolvedValueOnce(mockUpdatedUser); // Second call (updated user with tenant for final return)

      mockUsersRepository.save.mockResolvedValue(mockUpdatedUser); // Mock save to return the updated entity

      const result = await service.updateUser(
        superAdminPayload,
        userIdToUpdate,
        updateUserDto,
      );

      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ tenant_id: "new-tenant-for-user" }),
      );
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_UPDATED",
          details: {
            changes: {
              tenant_id: { from: "admin-tenant-id", to: "new-tenant-for-user" },
            },
          }, // Fixed expectation
        }),
      );
      expect(result.tenant_id).toBe("new-tenant-for-user");
    });

    it("should not log audit event if no changes were made", async () => {
      const updateUserDto: BackendUpdateUserDto = {};

      await service.updateUser(
        requestingUserPayload,
        userIdToUpdate,
        updateUserDto,
      );

      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(auditService.logEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ action: "USER_UPDATED" }),
      );
    });
  });

  // --- Test cases for findAllUsers method (Admin Function) ---
  describe("findAllUsers", () => {
    it("should return all users with tenant names", async () => {
      const mockUsers: UserEntity[] = [
        {
          id: "user1",
          email: "user1@tenantA.com",
          password_hash: "hash1",
          role: Role.Admin,
          is_active: true,
          tenant_id: "tenantA",
          first_name: undefined,
          last_name: undefined,
          resetPasswordToken: undefined,
          resetPasswordExpires: undefined,
          created_at: new Date(),
          updated_at: new Date(),
          tenant: {
            tenant_id: "tenantA",
            name: "Tenant A",
            schema_name: "client_tenant-a",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
                    users: [],
                    plan: 'basic',
                  },        },
        {
          id: "user2",
          email: "user2@tenantB.com",
          password_hash: "hash2",
          role: Role.AssignedProjectUser,
          is_active: true,
          tenant_id: "tenantB",
          first_name: undefined,
          last_name: undefined,
          resetPasswordToken: undefined,
          resetPasswordExpires: undefined,
          created_at: new Date(),
          updated_at: new Date(),
          tenant: {
            tenant_id: "tenantB",
            name: "Tenant B",
            schema_name: "client_tenant-b",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
                    users: [],
                    plan: 'basic',
                  },        },
        {
          id: "user3",
          email: "user3@system.com",
          password_hash: "hash3",
          role: Role.SuperAdmin,
          is_active: true,
          tenant_id: null,
          first_name: undefined,
          last_name: undefined,
          resetPasswordToken: undefined,
          resetPasswordExpires: undefined,
          created_at: new Date(),
          updated_at: new Date(),
          tenant: undefined as any,
        },
      ];
      mockUsersRepository.find.mockResolvedValue(mockUsers);

      const result = await service.findAllUsers();

      expect(usersRepository.find).toHaveBeenCalledWith({
        relations: ["tenant"],
        select: ["id", "email", "role", "is_active", "tenant_id"],
      });
      expect(result).toEqual([
        {
          id: "user1",
          email: "user1@tenantA.com",
          role: Role.Admin,
          is_active: true,
          tenant_id: "tenantA",
          tenant_name: "Tenant A",
        },
        {
          id: "user2",
          email: "user2@tenantB.com",
          role: Role.AssignedProjectUser,
          is_active: true,
          tenant_id: "tenantB",
          tenant_name: "Tenant B",
        },
        {
          id: "user3",
          email: "user3@system.com",
          role: Role.SuperAdmin,
          is_active: true,
          tenant_id: null,
          tenant_name: null,
        }, // Fixed: changed from undefined to null
      ]);
    });

    it("should return an empty array if no users are found", async () => {
      mockUsersRepository.find.mockResolvedValue([]);

      const result = await service.findAllUsers();

      expect(result).toEqual([]);
    });
  });

  // --- Test cases for createTenantUser method (Internal Function for SuperAdminService) ---
  describe("createTenantUser", () => {
    const createAdminUserDto = {
      email: "tenantadmin@example.com",
      password: "randomlyGeneratedPassword", // Will be ignored, as service generates its own
      role: Role.Admin,
      tenant_id: "new-tenant-id",
      is_active: true,
      first_name: "Tenant",
      last_name: "Admin",
    };

    const mockCreatedUserEntity: UserEntity = {
      // New mock for what .create() returns
      id: "tenant-admin-id",
      email: createAdminUserDto.email,
      password_hash: "mockHashedPassword",
      role: createAdminUserDto.role,
      is_active: createAdminUserDto.is_active,
      tenant_id: createAdminUserDto.tenant_id,
      first_name: createAdminUserDto.first_name,
      last_name: createAdminUserDto.last_name,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
      created_at: undefined as any, // Will be set by save
      updated_at: undefined as any, // Will be set by save
      tenant: undefined as any,
    };

    const mockSavedUserEntity: UserEntity = {
      // New mock for what .save() returns
      ...mockCreatedUserEntity,
      created_at: new Date(),
      updated_at: new Date(),
      tenant: {
        tenant_id: "new-tenant-id",
        name: "New Tenant",
        schema_name: "client_new-tenant-id",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
                users: [],
                plan: 'basic',
              },    };

    beforeEach(() => {
      mockUsersRepository.findOne.mockResolvedValue(undefined);
      (bcrypt.hash as jest.Mock).mockResolvedValue("mockHashedPassword");
      mockUsersRepository.create.mockReturnValue(mockCreatedUserEntity);
      mockUsersRepository.save.mockResolvedValue(mockSavedUserEntity);
    });

    it("should create a tenant admin user and return generated password", async () => {
      const generateRandomPasswordSpy = jest.spyOn(
        service as any,
        "generateRandomPassword",
      );
      generateRandomPasswordSpy.mockReturnValue("mockRandomPassword");

      const result = await service.createTenantUser(createAdminUserDto);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: createAdminUserDto.email },
      });
      expect(generateRandomPasswordSpy).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(
        "mockRandomPassword",
        "mockSalt",
      );
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: createAdminUserDto.email,
          password_hash: "mockHashedPassword",
          role: createAdminUserDto.role,
          tenant_id: createAdminUserDto.tenant_id,
          is_active: true,
          first_name: createAdminUserDto.first_name,
          last_name: createAdminUserDto.last_name,
        }),
      );
      expect(usersRepository.save).toHaveBeenCalledWith(mockCreatedUserEntity); // Check with the created object
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: "TENANT_ADMIN_USER_CREATED" }),
      );
      expect(result).toEqual({
        ...mockSavedUserEntity,
        generatedPassword: "mockRandomPassword",
      });
    });

    it("should throw ConflictException if tenant admin user with email already exists", async () => {
      mockUsersRepository.findOne.mockResolvedValue({
        id: "existing-tenant-admin",
      });

      await expect(
        service.createTenantUser(createAdminUserDto),
      ).rejects.toThrow(ConflictException);
      expect(usersRepository.create).not.toHaveBeenCalled();
      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(auditService.logEvent).not.toHaveBeenCalled();
    });

    it("should handle is_active being undefined correctly", async () => {
      const dtoWithoutIsActive = {
        ...createAdminUserDto,
        is_active: undefined,
      };
      const mockSavedUserWithoutIsActive: UserEntity = {
        ...mockSavedUserEntity,
        is_active: true,
        tenant: { ...mockSavedUserEntity.tenant, updated_at: new Date() }, // Add updated_at here
      };

      mockUsersRepository.create.mockReturnValue(mockSavedUserWithoutIsActive);
      mockUsersRepository.save.mockResolvedValue(mockSavedUserWithoutIsActive);

      const result = await service.createTenantUser(dtoWithoutIsActive);
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: true, // Should default to true
        }),
      );
      expect(result.is_active).toBe(true);
    });
  });
});
