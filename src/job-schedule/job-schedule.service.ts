import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { JobScheduleDTO } from './validators/job-schedule';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { GoogleService } from 'src/core/services/google.service';
import { BulkUpdateJobScheduleDTO } from './validators/bulk-update-job-schedule';

@Injectable()
export class JobScheduleService {

    constructor(private databaseService: DatabaseService, private googleService: GoogleService) {}

    async createJobSchedule(
        user: User, 
        companyId: number, 
        jobId: number, 
        body: JobScheduleDTO) 
    {
        try {
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                await this.databaseService.company.findFirstOrThrow({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });

                // Formatting dates
                body.startDate = `${body.startDate}Z`;
                body.endDate = `${body.endDate}Z`;

                await this.databaseService.jobSchedule.create({
                    data: {
                        companyId,
                        jobId,
                        ...body
                    }
                });
                return { message: ResponseMessages.SUCCESSFUL }
            }
        } catch (error) {
            console.log(error)
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    async updateJobSchedule(
        user: User, 
        companyId: number, 
        jobId: number, 
        scheduleId: number, 
        body: JobScheduleDTO
    ) {
        try {
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                await this.databaseService.company.findFirstOrThrow({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });

                // Check schedule exist or not
                await this.databaseService.jobSchedule.findFirstOrThrow({
                    where: {
                        id: scheduleId,
                        isDeleted: false
                    }
                });

                // Formatting dates
                body.startDate = `${body.startDate}Z`;
                body.endDate = `${body.endDate}Z`;

                await this.databaseService.jobSchedule.update({
                    where: {
                        id: scheduleId,
                        companyId,
                        jobId
                    },
                    data: {
                        companyId,
                        jobId,
                        ...body
                    }
                });

                await this.updateJobScheduleInGoogleCalendar(user, scheduleId);
                
                return { message: ResponseMessages.SUCCESSFUL }
            }
        } catch (error) {
            console.log(error)
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    async bulkUpdateJobSchedule(
        user: User, 
        companyId: number, 
        jobId: number, 
        body: BulkUpdateJobScheduleDTO[]) 
    {
        try {
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                await this.databaseService.company.findFirstOrThrow({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });

                // Formatting dates
                for(let event of body) {
                    event.startDate = `${event.startDate}Z`;
                    event.endDate = `${event.endDate}Z`;
                }

                await Promise.all(body.map(async (event) => {
                    await this.databaseService.jobSchedule.update({
                        where: {
                            id: event.scheduleId,
                            companyId,
                            jobId,
                            isDeleted: false
                        },
                        data: {
                            startDate: event.startDate,
                            endDate: event.endDate,
                        }
                    });
                }));
                return { message: ResponseMessages.SUCCESSFUL }
            }
        } catch (error) {
            console.log(error)
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    async deleteJobSchedule(
        user: User, 
        companyId: number, 
        jobId: number, 
        scheduleId: number
    ) {
        try {
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                await this.databaseService.company.findFirstOrThrow({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });

                // Check schedule exist or not
                let schedule = await this.databaseService.jobSchedule.findFirstOrThrow({
                    where: {
                        id: scheduleId
                    }
                });

                await this.databaseService.jobSchedule.update({
                    where: { id: scheduleId },
                    data: {
                        isDeleted: true
                    }
                });

                // Delete the job schedule from google calendar also
                if(schedule.eventId) {
                    let event = await this.googleService.getEventFromGoogleCalendar(user, schedule);
                    if(event) {
                        await this.googleService.deleteCalendarEvent(user, schedule.eventId)
                    }
                }

                return { message: ResponseMessages.SUCCESSFUL }
            }
        } catch (error) {
            console.log(error)
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    // Function to reflect the change in job schdule in google calendar event also
    async updateJobScheduleInGoogleCalendar(user: User, scheduleId: number) {
        let schedule = await this.databaseService.jobSchedule.findFirst({
            where: { id: scheduleId, isDeleted: false },
            include: {
                contractor: {
                    include: {
                        phase: true
                    }
                },
                job: {
                    include: {
                        customer: {
                            select: {
                                name: true
                            }
                        },
                        description: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        // reflect the change in google calendar (if already synced)
        if(schedule.eventId) {
            let event = await this.googleService.getEventFromGoogleCalendar(user, schedule);
            if(event) {
                await this.googleService.syncJobSchedule(user.id, schedule, schedule.eventId);
            }
        }
    }
}
