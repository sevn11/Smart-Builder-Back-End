import { IsEmail, IsNotEmpty, IsNumber } from 'class-validator'

export class ForgotPasswordDTO {

    @IsEmail()
    @IsNotEmpty()
    email: string;
}


export class PasswordResetDTO {

    @IsEmail()
    @IsNotEmpty()
    email: string;


    @IsNumber()
    @IsNotEmpty()
    code: number;
    
}