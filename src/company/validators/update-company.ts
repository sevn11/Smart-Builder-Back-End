import { IsEmail, IsOptional, IsString, IsNumber, IsDecimal, ValidateIf, IsNotEmpty } from "class-validator";

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

}