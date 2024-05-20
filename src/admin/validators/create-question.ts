import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum } from "class-validator";
import { QuestionTypes } from "src/core/utils";

export class CreateQuestionDTO {

    @IsString()
    @IsNotEmpty()
    question: string

    @IsString()
    @IsEnum(QuestionTypes)
    questionType: QuestionTypes

    @IsArray()
    @IsOptional()
    multipleOptions?: object

    // @IsNumber()
    // @Type(() => Number)
    // @IsNotEmpty()
    // categoryId: number

    @IsBoolean()
    @IsOptional()
    linkToPhase: boolean = false

    @IsBoolean()
    @IsOptional()
    linkToSelection: boolean = false

}