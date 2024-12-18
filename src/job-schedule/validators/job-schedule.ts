import { IsNotEmpty, IsNumber, IsString } from "class-validator";


export class JobScheduleDTO {
    @IsNumber()
    @IsNotEmpty()
    contractorId: number;

    @IsString()
    @IsNotEmpty()
    startDate: string;

    @IsString()
    @IsNotEmpty()
    endDate: string;

    @IsNumber()
    @IsNotEmpty()
    duration: number;
}