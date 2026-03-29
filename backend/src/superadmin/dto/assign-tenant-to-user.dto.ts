import { IsNotEmpty, IsUUID } from "class-validator";

export class AssignTenantToUserDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;
}
