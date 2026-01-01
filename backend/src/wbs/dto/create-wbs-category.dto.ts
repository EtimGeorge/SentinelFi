import { IsString, IsNotEmpty, Length } from "class-validator";

export class CreateWbsCategoryDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  description!: string;
}
