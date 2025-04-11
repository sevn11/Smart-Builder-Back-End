import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsNotEmpty, ValidateNested } from "class-validator";

class EventContractorDto {
    @IsInt()
    eventId: number;

    @IsArray()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    contractorGroups: number[];
}

export class ContractorAssignmentDTO {
    @IsNotEmpty()
    @IsDateString()
    startDate: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EventContractorDto)
    contractorIds: EventContractorDto[];
}