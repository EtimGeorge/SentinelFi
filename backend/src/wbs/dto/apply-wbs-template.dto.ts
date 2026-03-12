import { IsUUID, IsOptional } from 'class-validator';

export class ApplyWbsTemplateDto {
  @IsUUID()
  templateId!: string;

  @IsUUID()
  @IsOptional()
  parentWbsId?: string;
}
