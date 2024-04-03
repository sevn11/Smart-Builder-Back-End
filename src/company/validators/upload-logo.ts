import { IsNotEmpty, IsString } from "class-validator";

export class UploadLogoDTO {

    @IsString()
    @IsNotEmpty()
    filename: string

    @IsString()
    @IsNotEmpty()
    contentType: string

}