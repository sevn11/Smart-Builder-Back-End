import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class UpdateCompanyLogoDTO {

    @IsString()
    @IsNotEmpty()
    key: string

    @IsString()
    @IsNotEmpty()
    type: string

    @IsNumber()
    @IsNotEmpty()
    companyId: number

}