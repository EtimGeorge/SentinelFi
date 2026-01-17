// backend/src/auth/dto/login-tenant.dto.ts
import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
import { LoginUserDto } from './login-user.dto';

export class LoginTenantDto extends LoginUserDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;
}
