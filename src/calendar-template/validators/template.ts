import { IsNotEmpty, IsString } from "class-validator";

export class TemplateDTO {
    @IsString()
    @IsNotEmpty()
    name: string
}