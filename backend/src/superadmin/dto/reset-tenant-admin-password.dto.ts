import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  IsOptional,
} from "class-validator";

/**
 * DTO for SuperAdmin-initiated forced password reset of a tenant admin.
 * C5 FIX: Replaced `any` with a properly validated DTO.
 */
export class ResetTenantAdminPasswordDto {
  @IsString()
  @IsNotEmpty({ message: "New password is required." })
  @MinLength(8, { message: "Password must be at least 8 characters." })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, and one number.",
  })
  newPassword!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
