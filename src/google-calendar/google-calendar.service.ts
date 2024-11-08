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
                    if(response) {
                        return { status: response.status, message: response.message }
                    } else {
                        throw new InternalServerErrorException(); 
                    }
                } else {
                    return { status: false, message: "Project start date and end date not specified."}
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

                const synced = [];
                const skipped = [];
                
                if(company.jobs.length > 0 ) {
                    for (let job of company.jobs) {
                        if(job.startDate && job.endDate) {
                            let response = await this.googleService.syncToCalendar(user.id, job);
                            if(response.status) {
                                synced.push(job);
                            } else {
                                skipped.push(job);
                            }
                        }
                        else {
                            skipped.push(job);
                        }
                    }
                } else {
                    return { status: false, message: "No projects found"};
                }

                if(synced.length == 0) {
                    return { status: false, message: "Projects not inserted to google calendar"};
                }
                else {
                    return { status: true, message: "Projects synced with google calendar"};
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