import { IsNotEmpty, IsString } from "class-validator";

export class CreateUpdateQuestionnaireTemplateDTO {

    @IsString()
    @IsNotEmpty()
    name: string
}