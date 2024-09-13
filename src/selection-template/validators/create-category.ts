import { Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

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
}