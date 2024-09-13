import { Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class LabelDTO {
    @IsString()
    @IsNotEmpty()
    label: string

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
}