import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

class File {

    @IsNumber()
    @IsNotEmpty()
    id: number;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    @IsBoolean()
    isDirectory: boolean;

    @IsString()
    @IsNotEmpty()
    path: string;

    @IsString()
    @IsOptional()
    updatedAt: string;



}


export class ContractorFolderDTO {

    @IsString()
    @IsNotEmpty()
    name: string

    @ValidateNested()
    @Type(() => File)
    @IsOptional()
    parentFolder?: File | null;
}