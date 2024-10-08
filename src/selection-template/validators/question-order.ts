import { Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class QuestionOrderDTO {
    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    questionOrder: number
}