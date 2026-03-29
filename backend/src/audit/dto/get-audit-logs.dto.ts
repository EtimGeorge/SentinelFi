import { IsOptional, IsString, IsUUID, IsISO8601 } from "class-validator";
import { Transform } from "class-transformer";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class GetAuditLogsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === "" ? undefined : value))
  userId?: string | null;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === "" ? undefined : value))
  action?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === "" ? undefined : value))
  targetType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === "" ? undefined : value))
  tenantId?: string | null;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === "" ? undefined : value))
  userEmail?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === "" ? undefined : value))
  ipAddress?: string;

  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => (value === "" ? undefined : value))
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => (value === "" ? undefined : value))
  endDate?: string;
}
