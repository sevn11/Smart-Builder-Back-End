import { IsNotEmpty, IsString, IsEmail } from "class-validator";

export class ChangeEmailDTO {

    @IsString()
    @IsEmail()
    @IsNotEmpty()
    email: string

}