import { IsOptional, IsString, IsUUID, IsISO8601 } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class GetAuditLogsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsString()
  tenantId?: string | null; // Nullable for SuperAdmin to query all or specific

  @IsOptional()
  @IsString()
  userEmail?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;
}
