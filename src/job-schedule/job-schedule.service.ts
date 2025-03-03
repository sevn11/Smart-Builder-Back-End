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

    constructor(private databaseService: DatabaseService, private googleService: GoogleService) { }

    async createJobSchedule(
        user: User,
        companyId: number,
        jobId: number,
        body: JobScheduleDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
                await this.databaseService.company.findFirstOrThrow({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });

                // Formatting dates
                body.startDate = `${body.startDate}Z`;
                body.endDate = `${body.endDate}Z`;

                const jobSchedule = await this.databaseService.jobSchedule.create({
                    data: {
                        companyId,
                        jobId,
                        ...body,
                        isScheduledOnWeekend: true
                    }
                });
                // add the schedule to google calendar.
                if (jobSchedule) {
                    await this.addJobScheduleInGoogleCalendar(user, jobSchedule.id)
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

    async updateJobSchedule(
        user: User,
        companyId: number,
        jobId: number,
        scheduleId: number,
        body: JobScheduleDTO
    ) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
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
                        ...body,
                        isScheduledOnWeekend: true
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
        body: BulkUpdateJobScheduleDTO[]) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
                await this.databaseService.company.findFirstOrThrow({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });

                // Formatting dates
                for (let event of body) {
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
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
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

                const syncExist = await this.databaseService.googleEventId.findFirst({
                    where: {
                        userId: user.id,
                        companyId: companyId,
                        jobId: jobId,
                        jobScheduleId: schedule.id,
                        isDeleted: false,
                    },
                    orderBy: { id: 'desc' },
                    take: 1,
                });
                // Delete the job schedule from google calendar also
                if (syncExist && syncExist?.eventId) {
                    let event = await this.googleService.getEventFromGoogleCalendar(user, syncExist);
                    if (event) {
                        await this.googleService.deleteCalendarEvent(user, syncExist.eventId);
                        await this.databaseService.googleEventId.update({
                            where: { id: syncExist.id },
                            data: { isDeleted: true }
                        })
                    }
                }

                const job = await this.databaseService.job.findUnique({
                    where: { id: jobId }
                });

                // Delete Other user's schedule.
                await this.googleService.removeScheduleFromOthers(user.id, companyId, schedule, job);
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

        let syncExist = await this.databaseService.googleEventId.findFirst({
            where: {
                companyId: user.companyId,
                userId: user.id,
                jobId: schedule.job.id,
                jobScheduleId: schedule.id,
                isDeleted: false,
            },
            orderBy: { id: 'desc' },
            take: 1
        });

        // reflect the change in google calendar (if already synced)
        if (syncExist && syncExist.eventId) {
            let event = await this.googleService.getEventFromGoogleCalendar(user, syncExist);
            if (event) {
                await this.googleService.syncJobSchedule(user.id, schedule, syncExist.eventId, syncExist);
            }
        }

        await this.googleService.upsertJobScheduleEventIdForOthers(user.id, user.companyId, schedule, schedule.job)
    }

    async createGanttTask(user: User, jobId: number, companyId: number, body: any) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
                await this.databaseService.company.findFirstOrThrow({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });
                body.contractorId = parseInt(body.contractor);
                body.start_date = `${body.start_date}Z`;
                body.end_date = `${body.end_date}Z`;
                body.isScheduledOnWeekend = body.weekendschedule

                const jobSchedule = await this.databaseService.jobSchedule.create({
                    data: {
                        companyId,
                        jobId,
                        contractorId: body.contractorId,
                        startDate: body.start_date,
                        endDate: body.end_date,
                        isScheduledOnWeekend: body.isScheduledOnWeekend,
                        duration: body.duration,
                        isCritical: body.iscritical
                    }
                });
                return { message: ResponseMessages.SUCCESSFUL, data: jobSchedule }
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

    async updateGanttTask(user: User, jobId: number, companyId: number, id: number, body: any) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
                await this.databaseService.company.findFirstOrThrow({
                    where: { id: companyId, isDeleted: false }
                });

                let jobSchedule = await this.databaseService.jobSchedule.findFirstOrThrow({
                    where: { id: id, isDeleted: false, }
                })
                body.contractorId = body.contractor ? parseInt(body.contractor) : jobSchedule.contractorId;
                body.start_date = `${body.start_date}Z`;
                body.end_date = `${body.end_date}Z`;

                jobSchedule = await this.databaseService.jobSchedule.update({
                    where: { id: id },
                    data: {
                        contractorId: body.contractorId,
                        startDate: body.start_date,
                        endDate: body.end_date,
                        duration: body.duration,
                        isScheduledOnWeekend: body.weekendschedule,
                        isCritical: body.iscritical
                    }
                })
                return { message: ResponseMessages.SUCCESSFUL, data: jobSchedule }
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
    async addJobScheduleInGoogleCalendar(user: User, scheduleId: number) {
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
        const response = await this.googleService.syncJobSchedule(user.id, schedule);

        if (response.status && response.eventId) {
            await this.databaseService.googleEventId.create({
                data: {
                    userId: user.id,
                    companyId: user.companyId,
                    jobId: schedule.job.id,
                    jobScheduleId: schedule.id,
                    eventId: response.eventId
                }
            })
        }

        // Upsert for other users.
        await this.googleService.upsertJobScheduleEventIdForOthers(user.id, user.companyId, schedule, schedule.job)
    }
}
