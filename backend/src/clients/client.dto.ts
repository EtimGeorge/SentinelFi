import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsNotEmpty,
  Length,
  Matches,
} from "class-validator";
import { Transform } from "class-transformer";

/**
 * DTO for creating a new client with comprehensive validation
 */
export class CreateClientDto {
  @IsString()
  @IsNotEmpty({ message: "Client name is required" })
  @Length(2, 200, {
    message: "Client name must be between 2 and 200 characters",
  })
  @Transform(({ value }) => value?.trim()) // Sanitize: remove leading/trailing whitespace
  name!: string;

  @IsOptional()
  @IsEmail({}, { message: "Invalid email format" })
  @Transform(({ value }) => value?.toLowerCase().trim()) // Sanitize: normalize email
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-()]+$/, {
    message:
      "Invalid phone number format. Use digits, spaces, dashes, parentheses, or + symbol",
  })
  @Length(0, 20, { message: "Phone number cannot exceed 20 characters" })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500, { message: "Address cannot exceed 500 characters" })
  @Transform(({ value }) => value?.trim())
  address?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100, { message: "Industry name cannot exceed 100 characters" })
  @Transform(({ value }) => value?.trim())
  industry?: string;
}

/**
 * DTO for updating an existing client
 * All fields are optional to support partial updates
 */
export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @Length(2, 200, {
    message: "Client name must be between 2 and 200 characters",
  })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: "Invalid email format" })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-()]+$/, { message: "Invalid phone number format" })
  @Length(0, 20)
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500, { message: "Address cannot exceed 500 characters" })
  @Transform(({ value }) => value?.trim())
  address?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  @Transform(({ value }) => value?.trim())
  industry?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
