import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

class Contractor {
    @IsNumber()
    @IsNotEmpty()
    id: string;

    @IsBoolean()
    sendDetails: boolean;

    @IsBoolean()
    sendEventDetails: boolean;
}
export class SendInfoToContractorDTO {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Contractor)
    @IsNotEmpty()
    jobContractors: Contractor[];

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