import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class UpdateContractorFileDTO {
    @IsString()
    @IsNotEmpty()
    name: string
}