import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseBoolPipe, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
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
}
