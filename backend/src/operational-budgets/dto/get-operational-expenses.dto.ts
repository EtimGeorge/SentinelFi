import { IsOptional, IsString, IsDateString, IsUUID } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class GetOperationalExpensesDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  budget_id?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}