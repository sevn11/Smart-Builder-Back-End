import { IsNotEmpty, IsString } from "class-validator";


export class SetPasswordDTO {

    @IsString()
    @IsNotEmpty()
    password: string;

}