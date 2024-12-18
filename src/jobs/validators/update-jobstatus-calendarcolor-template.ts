import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { JobStatus } from 'src/core/utils';

export class UpdateJobStatusCalendarColorTemplateDto {

    @IsEnum(JobStatus)
    jobStatus: JobStatus;

    @IsString()
    @IsOptional()
    color: string;

    @IsNumber()
    @IsOptional()
    template: number;

}
