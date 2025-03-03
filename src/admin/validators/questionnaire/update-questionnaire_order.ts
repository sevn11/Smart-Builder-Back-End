import { Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateCategoryOrderDTO {

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    questionnaireOrder: number

}