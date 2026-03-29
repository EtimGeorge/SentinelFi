import { IsString, IsEnum, IsArray, IsOptional, IsUUID } from "class-validator";
import { IndustryType } from "../../../../shared/types/industry.enum";

export class CreateWbsTemplateDto {
  @IsString()
  name!: string;

  @IsEnum(IndustryType)
  industry!: IndustryType;

  @IsArray()
  structure!: any[];

  @IsOptional()
  @IsUUID()
  tenant_id?: string;
}
