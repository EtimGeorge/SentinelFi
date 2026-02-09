import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateSuperAdminProfileDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  newPassword?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional() // Current password required for sensitive changes
  currentPassword?: string;
}
