import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  MaxLength,
} from "class-validator";

export class CreateInflowDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  milestone_name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01, { message: "Amount received must be greater than zero." })
  amount_received!: number;

  @IsDateString()
  @IsNotEmpty()
  receipt_date!: Date;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bank_reference?: string;
}