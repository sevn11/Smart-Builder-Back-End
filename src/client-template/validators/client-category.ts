import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf } from "class-validator";

export class ClientCategoryDTO {
    @IsString()
    @IsNotEmpty()
    name: string

    @IsBoolean()
    isCategoryLinkedSelection: boolean

    @IsArray()
    @IsOptional()
    linkedSelections?: string[]

    @IsBoolean()
    isCategoryLinkedContractor: boolean

    @ValidateIf(o => o.isCategoryLinkedContractor === true)
    @IsArray()
    @IsNotEmpty() // Ensures that the array is not empty and contains values
    contractorIds?: number[];

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    questionnaireOrder: number
}