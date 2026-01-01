import { IsUUID, IsEmail, IsString, IsBoolean } from "class-validator";
import { Role } from "shared/types/role.enum";
import { User } from "shared/types/user"; // Path to shared User interface

// DTO for getting user lists (to exclude hash)
export class UserResponseDto implements User {
  @IsUUID()
  id!: string;
  @IsEmail()
  email!: string;
  @IsString()
  role!: Role;
  @IsBoolean()
  is_active!: boolean;
}
