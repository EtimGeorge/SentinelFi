import {
  IsNotEmpty,
  IsString,
  IsEmail,
  MinLength,
  IsBoolean,
  IsOptional,
} from "class-validator";
import { Transform } from "class-transformer";

export class LoginUserDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase()) // Normalize email case
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters." })
  @IsNotEmpty()
  password!: string;

  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
