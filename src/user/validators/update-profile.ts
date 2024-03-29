import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateMyProfileDTO {


    @IsString()
    @IsOptional()
    @IsNotEmpty()
    name?: string


}