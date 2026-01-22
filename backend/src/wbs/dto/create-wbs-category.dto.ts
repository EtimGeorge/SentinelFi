import { IsString, IsNotEmpty, Length } from "class-validator";

export class CreateWbsCategoryDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name!: string;
}
