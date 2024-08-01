import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional } from "class-validator";


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
}