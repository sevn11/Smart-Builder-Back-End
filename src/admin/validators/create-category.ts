import { Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateCategoryDTO {

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

    @IsBoolean()
    @IsOptional()
    linkToSelection: boolean = false

}