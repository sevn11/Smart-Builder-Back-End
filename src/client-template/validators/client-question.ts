import { Type } from "class-transformer"
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator"
import { QuestionTypes } from "src/core/utils"

export class ClientQuestionDTO {
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

    @IsBoolean()
    @IsOptional()
    isQuestionLinkedSelections: boolean = false

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    questionOrder: number

    @IsArray()
    @IsOptional()
    linkedSelections?: string

    @IsArray()
    @IsOptional()
    phaseIds?: number[]
}