import { Type } from "class-transformer";
import { IsArray, IsDateString, IsNotEmpty } from "class-validator";

export class ContractorAssignmentDTO {
    @IsNotEmpty()
    @IsDateString()
    startDate: string;

    @IsArray()
    @Type(() => Number)
    eventIds: number[];
}