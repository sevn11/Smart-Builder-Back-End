import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JobStatus } from 'src/core/utils';

export class UpdateJobStatusCalendarColorTemplateDto {

    @IsEnum(JobStatus)
    jobStatus: JobStatus;

    @IsString()
    @IsOptional()
    color: string;

    @IsString()
    @IsOptional()
    template: string;

}
