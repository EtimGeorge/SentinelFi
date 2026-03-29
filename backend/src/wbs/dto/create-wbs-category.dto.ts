import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  MaxLength,
  IsUUID,
} from "class-validator";
import { Transform } from "class-transformer";

/**
 * DTO for creating a WBS category — a cost-type label (e.g., Labor, Materials).
 * No financial fields: categories classify cost types, not amounts.
 */
export class CreateWbsCategoryDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name!: string;

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
  @Transform(({ value }) => (value && value.trim() ? value : null))
  @IsUUID()
  parent_id?: string | null;
}
