import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class BulkUpdateJobScheduleDTO {
    @IsNotEmpty()
    @IsNumber()
    scheduleId: number;

    @IsNumber()
    @IsNotEmpty()
    contractorId: number;

    @IsString()
    @IsNotEmpty()
    startDate: string;

    @IsString()
    @IsNotEmpty()
    endDate: string;
}
