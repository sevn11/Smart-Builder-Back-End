import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class ForgotPasswordDTO {

    @IsEmail()
    @IsNotEmpty()
    email: string;
}


export class PasswordResetDTO {

    @IsString()
    @IsNotEmpty()
    password: string;


    @IsNumber()
    @IsNotEmpty()
    code: number;

}