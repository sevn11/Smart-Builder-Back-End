import { IsNotEmpty, IsString } from "class-validator";


export class CustomizedContentDTO {

    @IsString()
    @IsNotEmpty()
    pageType: string

    @IsString()
    content: string
}