import { IsNumber, IsNotEmpty, Min, IsOptional, IsString, MaxLength } from "class-validator";

export class RegisterLpoPaymentDto {
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01, { message: "Payment amount must be greater than zero." })
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  payment_reference?: string;
}