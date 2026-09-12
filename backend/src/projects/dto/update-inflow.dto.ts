import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from "class-validator";

export class UpdateInflowDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  milestone_name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01, { message: "Amount received must be greater than zero." })
  amount_received?: number;

  @IsOptional()
  @IsDateString()
  receipt_date?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bank_reference?: string;
}