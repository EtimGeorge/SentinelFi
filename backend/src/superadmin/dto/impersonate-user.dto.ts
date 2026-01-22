import { IsUUID, IsNotEmpty } from 'class-validator';

export class ImpersonateUserDto {
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  @IsNotEmpty({ message: 'userId cannot be empty' })
  userId!: string; // Added definite assignment assertion
}
