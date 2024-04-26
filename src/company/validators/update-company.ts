import { IsEmail, IsOptional, IsString, IsNumber, IsDecimal } from "class-validator";

export class UpdateCompanyDTO {


    @IsString()
    @IsOptional()
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

    @IsEmail()
    @IsOptional()
    email?: string


    @IsString()
    @IsOptional()
    website?: string

    @IsNumber()
    @IsOptional()
    saleTaxRate?: number

}