import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { GetUser } from 'src/core/decorators';
import { CreateJobDTO, GetJobListDTO } from './validators';
import { User } from '@prisma/client';
import { JwtGuard } from 'src/core/guards';
import { UpdateJobStatusCalendarColorTemplateDto } from './validators/update-jobstatus-calendarcolor-template';
import { UpdateJobDTO } from './validators/update-job';

@UseGuards(JwtGuard)
@Controller('companies/:companyId/jobs')
export class JobsController {
    constructor(private jobService: JobsService) {

    }

    @Post()
    createJob(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Body() body: CreateJobDTO) {
        return this.jobService.createJob(user, companyId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Get('/open-jobs')
    getOpenJobList(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number) {
        return this.jobService.getOpenJobList(user, companyId);
    }


    @HttpCode(HttpStatus.OK)
    @Get()
    getJobList(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Query() query: GetJobListDTO) {
        return this.jobService.getJobList(user, companyId, query);
    }


    @HttpCode(HttpStatus.OK)
    @Get(':jobId')
    getJobDetails(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number) {
        return this.jobService.getJobDetails(user, companyId, jobId);
    }

    @Patch(':jobId/status_calendercolor_template')
    @HttpCode(HttpStatus.OK)
    updateJobStatusCalenderColorTemplate(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Body() body: UpdateJobStatusCalendarColorTemplateDto,
    ) {
        return this.jobService.updateJobStatusCalenderColorTemplate(user, companyId, jobId, body);
    }

    @Patch(':jobId')
    @HttpCode(HttpStatus.OK)
    updateJob(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Body() body: UpdateJobDTO,
    ) {
        return this.jobService.updateJob(user, companyId, jobId, body);
    }

    @Patch(':jobId/sale-tax-status')
    @HttpCode(HttpStatus.OK)
    updateJobSalesStatus(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Body() body: { salesTaxStatus: boolean },
    ) {
        return this.jobService.updateJobSalesStatus(user, companyId, jobId, body);
    }

    @Delete('/:jobId')
    @HttpCode(HttpStatus.OK)
    deleteJob(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number) {
        return this.jobService.deleteJob(user, companyId, jobId);
    }

    @HttpCode(HttpStatus.OK)
    @Get('/:jobId/job-schedules')
    getJobAndSchedules(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number) {
        return this.jobService.getJobAndSchedules(user, companyId, jobId);
    }

    @HttpCode(HttpStatus.OK)
    @Get(':jobId/info')
    getJobInfo(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number) {
        return this.jobService.getJobInfo(user, companyId, jobId);
    }
}
