import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from "class-validator";
import { AccountClassType } from "../../../../shared/types/general-ledger";

export class CreateAccountClassDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsString()
  @Length(1, 20)
  code!: string;

  @IsEnum(AccountClassType)
  baseType!: AccountClassType;
}

export class UpdateAccountClassDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  code?: string;

  @IsOptional()
  @IsEnum(AccountClassType)
  baseType?: AccountClassType;
}

export class CreateAccountGroupDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsString()
  @Length(1, 20)
  code!: string;

  @IsUUID()
  accountClassId!: string;
}

export class UpdateAccountGroupDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  code?: string;

  @IsOptional()
  @IsUUID()
  accountClassId?: string;
}

export class CreateGlAccountDto {
  @IsString()
  @Length(1, 150)
  name!: string;

  @IsString()
  @Length(1, 20)
  code!: string;

  @IsUUID()
  accountGroupId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateGlAccountDto {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  code?: string;

  @IsOptional()
  @IsUUID()
  accountGroupId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
