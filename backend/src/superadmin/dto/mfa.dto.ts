import { IsString, MinLength } from "class-validator";

export class ConfirmMfaDto {
  @IsString()
  code!: string;
}

export class DisableMfaDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;
}