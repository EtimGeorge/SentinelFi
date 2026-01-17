import { IsString, IsNotEmpty, IsUUID, IsNumber, IsOptional, IsDateString } from "class-validator";

export class CreateLpoDto {
    @IsString()
    @IsNotEmpty()
    lpo_number!: string;

    @IsUUID()
    @IsNotEmpty()
    project_id!: string;

    @IsUUID()
    @IsNotEmpty()
    wbs_id!: string;

    @IsString()
    @IsNotEmpty()
    vendor_name!: string;

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsNumber()
    @IsNotEmpty()
    amount_committed!: number;

    @IsDateString()
    @IsOptional()
    expected_delivery_date?: string;
}
