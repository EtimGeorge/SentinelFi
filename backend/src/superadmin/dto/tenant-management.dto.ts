import { IsString, IsNotEmpty, MinLength } from "class-validator";

export class ResetTenantAdminPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string; // Mandatory for auditing
}
