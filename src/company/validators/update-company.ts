import { IsEmail, IsOptional, IsString, IsNumber, IsDecimal, ValidateIf, IsNotEmpty, IsEnum } from "class-validator";
import { BuilderPlanTypes } from "src/core/utils/builder-plan-types";
import { ProfitCalculationType } from "src/core/utils/company"
export class UpdateCompanyDTO {


    @IsString()
    @IsNotEmpty()
    name?: string


    @IsString()
    @IsOptional()
    address?: string


    @IsString()
    @IsOptional()
    contact?: string


    @IsString()
    @IsOptional()
    phoneNumber?: string

    @ValidateIf((o) => o.email !== '' && o.email != null)
    @IsEmail()
    @IsOptional()
    email?: string


    @IsString()
    @IsOptional()
    website?: string

    @IsNumber()
    @IsOptional()
    saleTaxRate?: number

    @IsString()
    @IsOptional()
    logo?: string

    @IsEnum(BuilderPlanTypes)
    planType: BuilderPlanTypes;

    @IsEnum(ProfitCalculationType)
    profitCalculationType: ProfitCalculationType
}