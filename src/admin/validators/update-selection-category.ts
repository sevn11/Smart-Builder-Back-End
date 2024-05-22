import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateSelectionCategoryDTO {

    @IsString()
    @IsOptional()
    name: string

    @IsBoolean()
    @IsOptional()
    linkToPhase: boolean
}