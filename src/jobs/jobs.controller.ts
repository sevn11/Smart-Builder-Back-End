import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseBoolPipe, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { GetUser } from 'src/core/decorators';
import { CreateJobDTO, GetJobListDTO } from './validators';
import { User } from '@prisma/client';
import { JwtGuard } from 'src/core/guards';

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
    @Get()
    getJobList(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Query() query: GetJobListDTO) {
        return this.jobService.getJobList(user, companyId, query);
    }
    @HttpCode(HttpStatus.OK)
    @Get(':jobId')
    getJobDetails(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number) {
        return this.jobService.getJobDetails(user, companyId, jobId);
    }
    @Delete('/:jobId')
    @HttpCode(HttpStatus.OK)
    deleteJob(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number) {
        return this.jobService.deleteJob(user, companyId, jobId);
    }
}
