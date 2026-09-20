import { IsOptional, IsDateString } from "class-validator";

export class GetOpexAnalyticsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}