import { IsEmail, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class ContractorDTO {

    @IsString()
    @IsNotEmpty()
    name: string

    @IsEmail()
    @IsNotEmpty()
    email: string


    @IsString()
    @IsNotEmpty()
    phase: string
}