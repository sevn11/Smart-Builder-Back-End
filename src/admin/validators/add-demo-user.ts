import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator'
import { BuilderPlanTypes } from 'src/core/utils/builder-plan-types';

export class DemoUserDTO {

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsNotEmpty()
    companyName: string;

    @IsString()
    @IsNotEmpty()
    address?: string

    @IsString()
    @IsNotEmpty()
    phoneNumber?: string

    @IsEnum(BuilderPlanTypes)
    planType: BuilderPlanTypes;
}


