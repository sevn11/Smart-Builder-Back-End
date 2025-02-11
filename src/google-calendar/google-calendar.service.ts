import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { google } from 'googleapis';
import { GoogleService } from 'src/core/services/google.service';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class GoogleCalendarService {
    constructor(
        private databaseService: DatabaseService, 
        private readonly config: ConfigService,
        private googleService: GoogleService
    ) {}

    // Check google authentication status
    async checkAuthStatus(user: User, companyId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // check user has google access token
                if(user.googleAccessToken) {
                    let response = await this.googleService.checkAuthStatus(user);
                    return response;
                } else {
                    if(user.googleRefreshToken) {
                        let res = await this.googleService.refreshAccessToken(user);
                        if(res) {
                            return { isAuthentcaited: true }
                        }
                    }
                    return { isAuthentcaited: false }
                }
                
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // Handle job syncing to google
    async syncJobToGoogle(user: User, companyId: number, jobId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let job = await this.databaseService.job.findFirst({
                    where: { id: jobId, isDeleted: false },
                    include: {
                        customer: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                });
                if(job.startDate && job.endDate) {
                    let response = await this.googleService.syncToCalendar(user.id, job);
                    if(response.status) {
                        let jobSchedules = await this.databaseService.jobSchedule.findMany({
                            where: {
                                companyId,
                                jobId,
                                isDeleted: false
                            },
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

                        if(jobSchedules.length > 0) {
                            for(const jobSchedule of jobSchedules) {
                                let response = await this.googleService.syncJobSchedule(user.id,  jobSchedule);
                                if(response.status && response.eventId) {
                                    await this.databaseService.jobSchedule.update({
                                        where: { id: jobSchedule.id },
                                        data: { eventId: response.eventId }
                                    })
                                }
                            }
                        }
                        return { status: response.status, message: response.message }
                    } else {
                        throw new InternalServerErrorException(); 
                    }
                } else {
                    let jobSchedules = await this.databaseService.jobSchedule.findMany({
                        where: {
                            companyId,
                            jobId,
                            isDeleted: false
                        },
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
                    let notSynced = 0;
                    let synced = 0;
                    if(jobSchedules.length > 0) {
                        for(const jobSchedule of jobSchedules) {
                            let response = await this.googleService.syncJobSchedule(user.id,  jobSchedule);
                            if(response.status && response.eventId) {
                                synced += 1;
                                await this.databaseService.jobSchedule.update({
                                    where: { id: jobSchedule.id },
                                    data: { eventId: response.eventId }
                                })
                            } else {
                                notSynced += 1;
                            }
                        }
                    }
                    if(synced == jobSchedules.length) {
                        return { status: true, message: "Syncing success"}
                    } else if(synced == 0) {
                        return { status: false, message: "Syncing failed"}
                    } else {
                        return { status: true, message: "Some events are synced"}
                    }
                }

                
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // Handle syncing of all jobs to google calendar
    async syncAllJobsToGoogle(user: User, companyId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let company = await this.databaseService.company.findFirst({
                    where: {
                        id: companyId,
                        isDeleted: false
                    },
                    include: {
                        jobs: {
                            where: {
                                isDeleted: false
                            },
                            include: {
                                customer: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                });

                const syncedJobs = [];
                const skippedJobs = [];
                
                if(company.jobs.length > 0 ) {
                    for (let job of company.jobs) {
                        let jobSchedules = await this.databaseService.jobSchedule.findMany({
                            where: {
                                companyId,
                                jobId: job.id,
                                isDeleted: false,
                            },
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
                        if(job.startDate && job.endDate) {
                            let response = await this.googleService.syncToCalendar(user.id, job);
                            if(response.status) {
                                if(jobSchedules.length > 0) {
                                    for(const jobSchedule of jobSchedules) {
                                        let response = await this.googleService.syncJobSchedule(user.id,  jobSchedule);
                                        if(response.status && response.eventId) {
                                            await this.databaseService.jobSchedule.update({
                                                where: { id: jobSchedule.id },
                                                data: { eventId: response.eventId }
                                            })
                                        }
                                    }
                                }
                                syncedJobs.push(job);
                            } else {
                                skippedJobs.push(job);
                            }
                        }
                        else {

                            let notSynced = 0;
                            let synced = 0;
                            if(jobSchedules.length > 0) {
                                for(const jobSchedule of jobSchedules) {
                                    let response = await this.googleService.syncJobSchedule(user.id,  jobSchedule);
                                    if(response.status && response.eventId) {
                                        synced += 1;
                                        await this.databaseService.jobSchedule.update({
                                            where: { id: jobSchedule.id },
                                            data: { eventId: response.eventId }
                                        })
                                    } else {
                                        notSynced += 1;
                                    }
                                }
                            }
                            if (synced == jobSchedules.length) {
                                syncedJobs.push(job);
                            } else if (synced > 0) {
                                skippedJobs.push(job);
                            } else {
                                skippedJobs.push(job);
                            }
                        }
                    }
                } else {
                    return { status: false, message: "No projects found"};
                }

                if(syncedJobs.length > 0) {
                    return { status: true, message: "Syncing success"};
                }
                else {
                    return { status: false, message: "Syncing failed"};
                }
                
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }
}
