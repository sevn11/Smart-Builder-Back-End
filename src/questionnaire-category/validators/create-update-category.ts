import { Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateUpdateCategoryDTO {
    @IsNumber()
    @IsOptional()
    id: number;

    @IsString()
    @IsNotEmpty()
    name: string

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    questionnaireOrder: number

    @IsBoolean()
    @IsOptional()
    isCategoryLinkedInitialSelections: boolean

    @IsBoolean()
    @IsOptional()
    isCategoryLinkedPaintSelections: boolean
}