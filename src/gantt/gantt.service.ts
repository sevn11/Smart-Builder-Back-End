import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Job, TypeEnum, User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { GoogleService } from 'src/core/services/google.service';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';


export type LinkBody = {
    "source": string;
    "target": string,
    "type": "0" | "1" | "2" | "3"
}

export enum MapToType {
    ENUM_0 = "FINISH_TO_START",
    ENUM_1 = "START_TO_START",
    ENUM_2 = "FINISH_TO_FINISH",
    ENUM_3 = "START_TO_FINISH",
}


@Injectable()
export class GanttService {
    constructor(private databaseService: DatabaseService, private googleService: GoogleService) { }

    /**
     * Returns the gantt data
     * @param user 
     * @param companyId 
     * @param jobId 
     * @returns 
     */
    async getGanttData(user: User, companyId: number, jobId: number) {
        try {
            const allowedUserTypes = [UserTypes.ADMIN, UserTypes.BUILDER, UserTypes.EMPLOYEE];
            if (!allowedUserTypes.includes(user.userType) || (user.userType === UserTypes.BUILDER && user.companyId !== companyId)) {
                throw new ForbiddenException("Action Not Allowed");
            }

            const company = await this.databaseService.company.findUnique({
                where: { id: companyId, isDeleted: false }
            });

            if (!company) {
                throw new ForbiddenException("Action Not Allowed");
            }

            const job = await this.databaseService.job.findUnique({
                where: { id: jobId, companyId, isDeleted: false, isClosed: false },
                omit: { isDeleted: true },
                include: {
                    JobSchedule: {
                        orderBy: { startDate: 'asc' },
                        where: { isDeleted: false },
                        include: { contractor: { include: { phase: true } } },
                    },
                    customer: { omit: { isDeleted: true }, },
                    description: {
                        select: { id: true, name: true }
                    }
                },
            });

            if (!job) {
                return { error: 'Project not found', task: [], link: [] };
            }

            const tasks = await this.prepareTasks(job);
            const links = await this.prepareLinks(job)
            // Return the tasks and links for the gantt chart.
            return { tasks, links };
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.UNIQUE_EMAIL_ERROR);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            } else {
                throw new InternalServerErrorException();
            }
        }
    }

    /**
     * Prepare the task data for gantt
     * @param job 
     * @returns 
     */
    private async prepareTasks(job: any) {
        const data = await Promise.all(
            job?.JobSchedule.map(async (schedule: any, index: number) => {
                return {
                    id: index + 2,
                    text: `${schedule.contractor.phase.name}`,
                    type: 'task',
                    progress: 0,
                    open: true,
                    startDate: schedule.startDate,
                    endDate: schedule.endDate,
                    color: job.calendarColor,
                    scheduleId: schedule.id,
                    isScheduledOnWeekend: schedule.isScheduledOnWeekend,
                    contractorId: schedule.contractorId,
                    parent: job.id,
                    duration: schedule.duration,
                    iscritical: schedule.isCritical
                }
            })
        )
        const tasks = [
            {
                id: job.id,
                text: `${job.customer?.name}: ${job.description.name ?? ""}`,
                type: "project",
                progress: 0,
                open: true,
                start_date: job.startDate,
                end_date: job.endDate,
                color: job.calendarColor,
                customerId: job.customer?.id,
                isScheduledOnWeekend: false,
                contractorId: null
            },
            ...data
        ]

        return tasks;
    }

    /**
     * Prepares the links for the gantt chart
     * @param job Job entity
     * @returns Array of schedule links
     */
    private async prepareLinks(job: any) {
        const scheduleLinks = await this.databaseService.jobScheduleLink.findMany({
            where: {
                jobId: job.id,
                isDeleted: false,
            },
            select: {
                id: true,
                sourceId: true,
                targetId: true,
                type: true,
            }
        });

        return scheduleLinks;
    }

    /**
     * Creates the link between tasks
     * @param user 
     * @param companyId 
     * @param jobId 
     * @param body 
     * @returns 
     */
    async createLink(user: User, companyId: number, jobId: number, body: LinkBody) {
        try {
            // Check if User is Admin or Builder of the Company
            if (user.userType === UserTypes.ADMIN || user.userType === UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType === UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                await this.databaseService.jobSchedule.findUniqueOrThrow({
                    where: { id: Number(body.source), isDeleted: false, jobId, companyId }
                });
                await this.databaseService.jobSchedule.findUniqueOrThrow({
                    where: { id: Number(body.target), isDeleted: false, jobId, companyId }
                });
                await this.databaseService.job.findUniqueOrThrow({
                    where: { id: jobId, isDeleted: false }
                });

                const link = await this.databaseService.jobScheduleLink.create({
                    data: {
                        companyId,
                        jobId,
                        sourceId: Number(body.source),
                        targetId: Number(body.target),
                        type: MapToType[`ENUM_${body.type}`] as TypeEnum,
                    }
                })

                return { link };
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.UNIQUE_EMAIL_ERROR);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            } else {
                throw new InternalServerErrorException();
            }
        }
    }

    async deleteLink(user: User, companyId: number, jobId: number, linkId: number) {
        try {
            // Check if User is Admin or Builder of the Company
            if (user.userType === UserTypes.ADMIN || user.userType === UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType === UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                console.log({
                    id: linkId,
                    jobId,
                    companyId
                })
                const whereQuery = { id: linkId, jobId, companyId }
                const link = await this.databaseService.jobScheduleLink.findUnique({
                    where: whereQuery
                });

                if (!link) {
                    throw new ForbiddenException("No link found.");
                }

                await this.databaseService.jobScheduleLink.update({
                    where: whereQuery,
                    data: { isDeleted: true }
                })

                return { message: 'Link removed successfully' }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.UNIQUE_EMAIL_ERROR);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            } else {
                throw new InternalServerErrorException();
            }
        }
    }

    async getGlobalCalendarData(user: User, companyId: number) {
        try {
            // Check if User is Admin or Builder of the Company
            if (user.userType === UserTypes.ADMIN || user.userType === UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType === UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let company = await this.databaseService.company.findUnique({
                    where: { id: companyId, isDeleted: false, }
                });

                if (!company) {
                    throw new ForbiddenException("Action Not Allowed")
                }

                let jobs = await this.databaseService.job.findMany({
                    where: { companyId, isDeleted: false, isClosed: false, },
                    omit: { isDeleted: true },
                    include: {
                        JobSchedule: {
                            where: { isDeleted: false },
                            include: {
                                contractor: { include: { phase: true } }
                            },
                            orderBy: { startDate: 'asc' }
                        },
                        customer: {
                            omit: { isDeleted: true },
                        },
                        description: {
                            select: { id: true, name: true }
                        }
                    }
                });

                const openJobs = await Promise.all(
                    jobs.map(async (job) => { return await this.prepareTasks(job); })
                )
                const allEvents = openJobs.flat();
                const openLinks = await Promise.all(
                    jobs.map(async (job) => { return await this.prepareLinks(job) })
                );

                const allLinks = openLinks.flat();
                return { openJobs: allEvents, links: allLinks };

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.UNIQUE_EMAIL_ERROR);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            } else {
                throw new InternalServerErrorException();
            }
        }
    }
}
