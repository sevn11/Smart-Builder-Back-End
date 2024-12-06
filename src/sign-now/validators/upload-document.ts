import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";


export class UploadDocumentDTO {
    @IsOptional()
    @IsArray()
    tags?: any[];
}