import { Body, Controller, Delete, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JobScheduleService } from './job-schedule.service';
import { JwtGuard } from 'src/core/guards';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { JobScheduleDTO } from './validators/job-schedule';
import { BulkUpdateJobScheduleDTO } from './validators/bulk-update-job-schedule';

@UseGuards(JwtGuard)
@Controller('companies/:companyId/job/:jobId/job-schedule')
export class JobScheduleController {
    constructor(private jobScheduleService: JobScheduleService) { }

    @Post()
    createJobSchedule(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Body() body: JobScheduleDTO,
    ) {
        return this.jobScheduleService.createJobSchedule(user, companyId, jobId, body);
    }

    @Patch(':scheduleId')
    updateJobSchedule(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Param('scheduleId', ParseIntPipe) scheduleId: number,
        @Body() body: JobScheduleDTO,
    ) {
        return this.jobScheduleService.updateJobSchedule(user, companyId, jobId, scheduleId, body);
    }

    @Post('/bulk-update')
    bulkUpdateJobSchedule(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Body() body: BulkUpdateJobScheduleDTO[],
    ) {
        return this.jobScheduleService.bulkUpdateJobSchedule(user, companyId, jobId, body);
    }

    @Delete(':scheduleId')
    deleteJobSchedule(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Param('scheduleId', ParseIntPipe) scheduleId: number,
    ) {
        return this.jobScheduleService.deleteJobSchedule(user, companyId, jobId, scheduleId);
    }

    @Post('/gantt-data')
    createTaskFromGantt(
        @GetUser() user: User,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Body() body: any
    ) {
        return this.jobScheduleService.createGanttTask(user, jobId, companyId, body);
    }

    @Patch('/gantt-data/:id')
    updateTaskFromGantt(
        @GetUser() user: User,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: any
    ) {
        return this.jobScheduleService.updateGanttTask(user, jobId, companyId, id, body);
    }
}
