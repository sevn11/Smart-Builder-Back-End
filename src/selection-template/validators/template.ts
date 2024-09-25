import { IsNotEmpty, IsString } from "class-validator";

export class TemplateNameDTO {
    @IsString()
    @IsNotEmpty()
    name: string
}