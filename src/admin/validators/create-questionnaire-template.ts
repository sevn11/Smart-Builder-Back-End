import { IsNotEmpty, IsString } from "class-validator";

export class CreateQuestionnaireTemplateDTO {

    @IsString()
    @IsNotEmpty()
    name: string

}