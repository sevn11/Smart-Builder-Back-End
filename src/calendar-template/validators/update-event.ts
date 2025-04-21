import { Type } from "class-transformer"
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional } from "class-validator"

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
    phaseId: number

    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    contractor: number
}