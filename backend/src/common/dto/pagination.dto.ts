import { IsOptional, IsInt, Min, Max, IsDateString } from "class-validator";
import { Type } from "class-transformer";
import { PaginationDto as IPaginationDto } from "@shared/types/pagination.dto"; // Import the shared interface

export class PaginationDto implements IPaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number) // Ensure it's transformed to a number
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number) // Ensure it's transformed to a number
  limit?: number = 10;
}

export class DateRangeDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
