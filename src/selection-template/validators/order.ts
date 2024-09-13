import { Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CategoryOrderDTO {
    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    questionnaireOrder: number

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    categoryId: number
}