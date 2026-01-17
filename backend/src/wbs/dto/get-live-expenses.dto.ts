import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsDateString,
  IsNumber,
  IsIn,
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { VarianceFlag } from "@shared/types/get-live-expenses.dto"; // Import from shared

export class GetLiveExpensesDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  wbsId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(VarianceFlag)
  varianceFlag?: VarianceFlag;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString() // ADDED BACK
  endDate?: string; // ADDED BACK

  @IsOptional()
  @IsString()
  description?: string; // Renamed from itemDescription

  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @IsOptional()
  @IsString()
  sortBy?: string = "created_at";

  @IsOptional()
  @IsString()
  @IsIn(["ASC", "DESC"])
  sortOrder?: "ASC" | "DESC" = "DESC";

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
