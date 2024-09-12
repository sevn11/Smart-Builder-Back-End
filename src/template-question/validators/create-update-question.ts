import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsEnum, IsNumber } from "class-validator";
import { QuestionTypes } from "src/core/utils";

export class CreateUpdateQuestionDTO {

    @IsString()
    @IsNotEmpty()
    question: string

    @IsString()
    @IsEnum(QuestionTypes)
    type: QuestionTypes

    @IsArray()
    @IsOptional()
    multipleOptions?: object


    @IsBoolean()
    @IsOptional()
    isQuestionLinkedPhase: boolean = false

    @IsNumber()
    @IsOptional()
    linkedPhase: number

    @IsBoolean()
    @IsOptional()
    isQuestionLinkedSelections: boolean = false

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    questionOrder: number

}