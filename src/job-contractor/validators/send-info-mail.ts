import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";


export class SendInfoToContractorDTO {
    @IsArray()
    @IsNumber({}, { each: true })
    @IsNotEmpty()
    jobContractors: number[];

    @IsArray()
    @IsNumber({}, { each: true })
    @IsNotEmpty()
    files: number[];

    @IsOptional()
    @IsBoolean()
    sendCC: boolean;

    @IsString()
    @IsNotEmpty()
    subject: string
}