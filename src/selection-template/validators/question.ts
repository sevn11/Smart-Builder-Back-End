import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { QuestionTypes } from "src/core/utils";

export class QuestionDTO {
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
    isQuestionLinkedPhase: boolean = false;

    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    linkedPhase: number

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    questionOrder: number

    @IsArray()
    @IsOptional()
    phaseIds?: number[]
}