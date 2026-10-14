import { IsEnum, IsOptional, IsString, IsIn } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { VendorStatus } from "../entities/vendor.entity";

export class QueryVendorsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;

  @IsOptional()
  @IsString()
  @IsIn(["ASC", "DESC"])
  sortOrder?: "ASC" | "DESC" = "ASC";
}
