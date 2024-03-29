import { IsNotEmpty, IsString } from "class-validator";

export class ChangePasswordDTO {

    @IsString()
    @IsNotEmpty()
    oldPassword: string

    @IsString()
    @IsNotEmpty()
    newPassword: string



}