import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsEnum } from "class-validator";
import { QuestionTypes } from "src/core/utils";

export class UpdateQuestionDTO {

    @IsString()
    @IsNotEmpty()
    question: string

    @IsString()
    @IsEnum(QuestionTypes)
    questionType: QuestionTypes

    @IsArray()
    @IsOptional()
    multipleOptions?: object

    @IsBoolean()
    @IsOptional()
    linkToPhase: boolean = false

    @IsBoolean()
    @IsOptional()
    linkToInitialSelection: boolean = false

    @IsBoolean()
    @IsOptional()
    linkToPaintSelection: boolean = false

}