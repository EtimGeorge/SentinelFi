import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsUUID,
  IsOptional,
} from "class-validator";

export class RegisterUserDto {
  @IsEmail({}, { message: "Invalid email format" })
  @IsNotEmpty({ message: "Email is required" })
  email!: string;

  @IsNotEmpty({ message: "Password is required" })
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  // Add more password strength validations (e.g., regex for special characters, numbers, etc.)
  password!: string;

  @IsOptional()
  @IsUUID("4", { message: "Invalid tenant ID format" }) // Validate if it's a UUID v4
  tenant_id?: string;
  // Note: confirmPassword is handled on the frontend for matching, not sent to backend DTO
}
