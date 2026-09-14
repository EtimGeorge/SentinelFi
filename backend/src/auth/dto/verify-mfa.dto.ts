import { IsBoolean, IsOptional, IsString } from "class-validator";

export class VerifyMfaDto {
  @IsString()
  mfaToken!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}