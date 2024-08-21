import { IsDateString, IsEmail, IsMobilePhone, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, ValidateIf } from "class-validator"

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
    @ValidateIf((o) => o.telephone !== '' && o.telephone != null)
    @IsNotEmpty()
    @IsOptional()
    telephone: string

    @IsString()
    @ValidateIf((o) => o.mobileNumber1 !== '' && o.mobileNumber1 != null)
    @IsMobilePhone('en-US')
    @IsOptional()
    mobileNumber1: string


    @IsString()
    @ValidateIf((o) => o.mobileNumber2 !== '' && o.mobileNumber2 != null)
    @IsPhoneNumber()
    @IsOptional()
    mobileNumber2: string


    @IsString()
    @IsOptional()
    @ValidateIf((o) => o.emailAddress1 !== '' && o.emailAddress1 != null)
    @IsEmail()
    emailAddress1: string


    @IsString()
    @ValidateIf((o) => o.emailAddress2 !== '' && o.emailAddress2 != null)
    @IsEmail()
    @IsOptional()
    emailAddress2: string


    @IsString()
    @ValidateIf((o) => o.employer1 !== '' && o.employer1 != null)
    @IsNotEmpty()
    @IsOptional()
    employer1: string


    @IsString()
    @ValidateIf((o) => o.employer2 !== '' && o.employer2 != null)
    @IsNotEmpty()
    @IsOptional()
    employer2: string


    @IsString()
    @ValidateIf((o) => o.workTelephone1 !== '' && o.workTelephone1 != null)
    @IsNotEmpty()
    @IsOptional()
    workTelephone1: string

    @IsString()
    @ValidateIf((o) => o.workTelephone2 !== '' && o.workTelephone2 != null)
    @IsNotEmpty()
    @IsOptional()
    workTelephone2: string

    @IsDateString()
    @IsOptional()
    meetDate: Date
}