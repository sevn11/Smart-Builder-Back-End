import { IsDateString, IsEmail, IsMobilePhone, IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from "class-validator"

export class UpdateCustomerDTO {
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    name: string

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    address: string

    @IsString()
    @IsOptional()
    state?: string

    @IsString()
    @IsOptional()
    city?: string

    @IsString()
    @IsOptional()
    zip?: string


    @IsString()
    @IsNotEmpty()
    @IsOptional()
    telephone: string

    @IsString()
    @IsMobilePhone('en-US')
    @IsOptional()
    mobileNumber1: string


    @IsString()
    @IsPhoneNumber()
    @IsOptional()
    mobileNumber2: string


    @IsString()
    @IsOptional()
    @IsEmail()
    emailAddress1: string


    @IsString()
    @IsEmail()
    @IsOptional()
    emailAddress2: string


    @IsString()
    @IsNotEmpty()
    @IsOptional()
    employer1: string


    @IsString()
    @IsNotEmpty()
    @IsOptional()
    employer2: string


    @IsString()
    @IsNotEmpty()
    @IsOptional()
    workTelephone1: string

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    workTelephone2: string

    @IsDateString()
    @IsOptional()
    meetDate: Date
}