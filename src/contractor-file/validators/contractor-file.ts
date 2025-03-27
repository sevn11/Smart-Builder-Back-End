import { IsArray, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class ContractorFileDTO {

    @IsString()
    @IsOptional()
    parentFolderPath: string | null | undefined;
}