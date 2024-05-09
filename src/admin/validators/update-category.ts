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
    linkToSelection: boolean

}