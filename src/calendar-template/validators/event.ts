import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class EventDTO {

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    duration: number

    @IsBoolean()
    @IsOptional()
    isScheduledOnWeekend: boolean = false

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    phaseId: number

    @IsArray()
    @IsNumber({}, { each: true })
    @IsNotEmpty()
    contractorIds: number[]
}