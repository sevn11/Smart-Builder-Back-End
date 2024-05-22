import { Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateSelectionCategoryDTO {

    @IsString()
    @IsNotEmpty()
    name: string

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    questionnaireOrder: number

    @IsBoolean()
    @IsOptional()
    linkToPhase: boolean = false

}