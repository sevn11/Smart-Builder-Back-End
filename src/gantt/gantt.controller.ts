import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { GanttService } from './gantt.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';

export type LinkBody = {
    "source": string;
    "target": string,
    "type": "0" | "1" | "2" | "3"
}

@UseGuards(JwtGuard)
@Controller('companies/:companyId/gantt')
export class GanttController {

    constructor(private ganttService: GanttService) { }

    // Returns the gantt data including tasks and links
    @Get('job/:jobId/task')
    async getGanttData(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number
    ) {
        return this.ganttService.getGanttData(user, companyId, jobId);
    }

    // Create the link between tasks.
    @Post('job/:jobId/link')
    async addLinkToJob(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Body() body: LinkBody
    ) {
        return this.ganttService.createLink(user, companyId, jobId, body);
    }

    @Delete('job/:jobId/link/:linkId')
    async deleteLink(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Param('linkId', ParseIntPipe) linkId: number,
    ) {
        return this.ganttService.deleteLink(user, companyId, jobId, linkId);
    }

    @Get('/global-data')
    async getGlobalCalendarData(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
    ) {
        return this.ganttService.getGlobalCalendarData(user, companyId);
    }
}
