import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { Role } from '@shared/types/role.enum';
import { LoginUserDto } from './dto/login-user.dto';

// Mock bcrypt explicitly
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  genSalt: jest.fn(() => Promise.resolve('mockSalt')),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: Repository<UserEntity>;
  let jwtService: JwtService;
  let auditService: AuditService;

  // Mock data
  const MOCK_USER: UserEntity = {
    id: 'user-id-1',
    email: 'test@example.com',
    password_hash: 'hashedPassword',
    role: Role.AssignedProjectUser,
    is_active: true,
    tenant_id: 'tenant-id-1',
    created_at: new Date(),
    updated_at: new Date(),
    resetPasswordToken: undefined,
    resetPasswordExpires: undefined,
    first_name: 'Test',
    last_name: 'User',
    tenant: {
        id: 'tenant-id-1',
        name: 'Test Tenant',
        schema_name: 'tenant_1',
        description: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        users: [],
        projects: [],
        operationalBudgets: []
    } as any, // Mock the tenant property as needed
  };

  const MOCK_LOGIN_DTO: LoginUserDto = {
    email: 'test@example.com',
    password: 'password123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useClass: Repository, // Use a mock class for the repository
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'mockAccessToken'),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    jwtService = module.get<JwtService>(JwtService);
    auditService = module.get<AuditService>(AuditService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should successfully log in a user with correct credentials', async () => {
      // Mock repository findOne method
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(MOCK_USER);
      // Mock bcrypt compare method to return true
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(MOCK_LOGIN_DTO);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: MOCK_LOGIN_DTO.email },
        select: [
          'id',
          'email',
          'password_hash',
          'role',
          'is_active',
          'tenant_id',
        ],
        relations: ['tenant'],
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        MOCK_LOGIN_DTO.password,
        MOCK_USER.password_hash
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: MOCK_USER.email,
        sub: MOCK_USER.id,
        role: MOCK_USER.role,
        tenant_id: MOCK_USER.tenant_id,
      });
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_SUCCESS' })
      );
      expect(result).toEqual({
        access_token: 'mockAccessToken',
        user: {
          id: MOCK_USER.id,
          email: MOCK_USER.email,
          role: MOCK_USER.role,
          is_active: MOCK_USER.is_active,
          tenant_id: MOCK_USER.tenant_id,
          tenant_name: MOCK_USER.tenant?.name,
          isSuperAdmin: MOCK_USER.role === Role.SuperAdmin,
        },
      });
    });

    it('should throw UnauthorizedException for invalid credentials (user not found)', async () => {
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);

      await expect(service.login(MOCK_LOGIN_DTO)).rejects.toThrow(
        UnauthorizedException
      );
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILURE' })
      );
      expect(usersRepository.findOne).toHaveBeenCalled();
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid credentials (inactive user)', async () => {
        const inactiveUser = { ...MOCK_USER, is_active: false };
        jest.spyOn(usersRepository, 'findOne').mockResolvedValue(inactiveUser);
  
        await expect(service.login(MOCK_LOGIN_DTO)).rejects.toThrow(
          UnauthorizedException
        );
        expect(auditService.logEvent).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'LOGIN_FAILURE' })
          );
        expect(usersRepository.findOne).toHaveBeenCalled();
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(jwtService.sign).not.toHaveBeenCalled();
      });

    it('should throw UnauthorizedException for invalid credentials (wrong password)', async () => {
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(MOCK_USER);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Wrong password

      await expect(service.login(MOCK_LOGIN_DTO)).rejects.toThrow(
        UnauthorizedException
      );
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILURE' })
      );
      expect(usersRepository.findOne).toHaveBeenCalled();
      expect(bcrypt.compare).toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const MOCK_REGISTER_DTO = {
        email: 'newuser@example.com',
        password: 'newPassword123',
        tenant_id: 'tenant-id-1',
    };
    const MOCK_NEW_USER_ENTITY = {
        ...MOCK_USER,
        id: 'new-user-id',
        email: 'newuser@example.com',
        tenant: {
            id: 'tenant-id-1',
            name: 'Test Tenant',
        } as any,
    };

    beforeEach(() => {
        // Mock registerUser internal call
        jest.spyOn(service, 'registerUser' as any).mockResolvedValue(MOCK_NEW_USER_ENTITY);
        // Ensure findOne for existing user returns undefined
        jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);
    });

    it('should successfully register a new user', async () => {
        const result = await service.register(MOCK_REGISTER_DTO);

        expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { email: MOCK_REGISTER_DTO.email } });
        expect(service['registerUser']).toHaveBeenCalledWith(
            MOCK_REGISTER_DTO.email,
            MOCK_REGISTER_DTO.password,
            Role.AssignedProjectUser, // Default role as per logic
            MOCK_REGISTER_DTO.tenant_id
        );
        expect(result).toEqual({
            id: MOCK_NEW_USER_ENTITY.id,
            email: MOCK_NEW_USER_ENTITY.email,
            role: MOCK_NEW_USER_ENTITY.role,
            is_active: MOCK_NEW_USER_ENTITY.is_active,
            tenant_id: MOCK_NEW_USER_ENTITY.tenant_id,
            tenant_name: MOCK_NEW_USER_ENTITY.tenant?.name,
        });
        expect(auditService.logEvent).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'USER_CREATED' })); // Logged by registerUser
    });

    it('should throw ConflictException if user with email already exists', async () => {
        jest.spyOn(usersRepository, 'findOne').mockResolvedValue(MOCK_USER);

        await expect(service.register(MOCK_REGISTER_DTO)).rejects.toThrow(ConflictException);
        expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { email: MOCK_REGISTER_DTO.email } });
        expect(service['registerUser']).not.toHaveBeenCalled();
    });
  });

});