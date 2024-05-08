import { IsNotEmpty, IsString } from "class-validator";

export class UpdateQuestionnaireTemplateDTO {

    @IsString()
    @IsNotEmpty()
    name: string

}