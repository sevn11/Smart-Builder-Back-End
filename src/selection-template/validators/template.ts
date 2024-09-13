import { IsNotEmpty, IsString } from "class-validator";

export class UpdateTemplateNameDTO {
    @IsString()
    @IsNotEmpty()
    name: string
}