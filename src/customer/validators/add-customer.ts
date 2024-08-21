import { IsDateString, IsEmail, IsMobilePhone, IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from "class-validator";

export class AddCustomerDTO {

    @IsString()
    @IsNotEmpty()
    name: string

    @IsString()
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
    @IsOptional()
    employer1: string


    @IsString()
    @IsOptional()
    employer2: string


    @IsString()
    @IsOptional()
    workTelephone1: string

    @IsString()
    @IsOptional()
    workTelephone2: string

    @IsDateString()
    @IsOptional()
    meetDate: Date
}