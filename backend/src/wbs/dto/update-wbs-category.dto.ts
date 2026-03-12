import { IsString, IsOptional, Length, MaxLength, IsUUID, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";

/**
 * DTO for updating a WBS category. All fields are optional.
 */
export class UpdateWbsCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @IsOptional()
  @Transform(({ value }) => (value && typeof value === 'string' && value.trim() ? value : null))
  @IsUUID()
  parent_id?: string | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
