import { IsEnum, IsNotEmpty, IsString, IsUUID } from "class-validator";
import { AnnotationTargetType } from "../annotation.entity";

export class CreateAnnotationDto {
  @IsEnum(AnnotationTargetType)
  @IsNotEmpty()
  target_type!: AnnotationTargetType;

  @IsUUID()
  @IsNotEmpty()
  target_id!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}
