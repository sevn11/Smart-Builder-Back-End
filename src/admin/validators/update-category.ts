import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateCategoryDTO {

    @IsString()
    @IsOptional()
    name: string

    @IsBoolean()
    @IsOptional()
    linkToPhase: boolean

    @IsBoolean()
    @IsOptional()
    linkToInitialSelection: boolean = false

    @IsBoolean()
    @IsOptional()
    linkToPaintSelection: boolean = false

}