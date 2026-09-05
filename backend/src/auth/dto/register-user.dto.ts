import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";

export class RegisterUserDto {
  @IsEmail({}, { message: "Invalid email format" })
  @IsNotEmpty({ message: "Email is required" })
  email!: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsNotEmpty({ message: "Password is required" })
  @MinLength(12, { message: "Password must be at least 12 characters long" })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  password!: string;

  // tenant_id removed — public self-registration must not allow arbitrary tenant assignment (prevents tenant infiltration).
  // Tenant assignment is via invitation flow only.
  // Note: confirmPassword is handled on the frontend for matching, not sent to backend DTO
}
