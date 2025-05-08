import { Type } from "class-transformer"
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional } from "class-validator"

export class EventUpdateDTO {
    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    duration: number

    @IsBoolean()
    @IsOptional()
    weekendschedule: boolean = false

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    phase: number

    @IsNotEmpty()
    @IsDateString()
    startDate: string;

    @IsNotEmpty()
    @IsDateString()
    endDate: string;
}