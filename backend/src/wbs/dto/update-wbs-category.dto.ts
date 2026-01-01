import { IsString, IsNotEmpty, Length, IsOptional } from "class-validator";

export class UpdateWbsCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  description?: string;
}
