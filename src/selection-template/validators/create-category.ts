import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf } from "class-validator";

export class CreateCategoryDTO {
    @IsString()
    @IsNotEmpty()
    name: string

    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    linkedPhase: number

    @IsBoolean()
    @IsOptional()
    isCategoryLinkedPhase: boolean = false

    @ValidateIf(o => o.isCategoryLinkedPhase === true)
    @IsArray()
    @IsNotEmpty()
    contractorIds?: number[];
}