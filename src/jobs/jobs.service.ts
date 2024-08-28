import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { CreateJobDTO, GetJobListDTO } from './validators';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JobStatus, PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { UpdateJobStatusCalendarColorTemplateDto } from './validators/update-jobstatus-calendarcolor-template';
import { UpdateJobDTO } from './validators/update-job';

@Injectable()
export class JobsService {

    constructor(private databaseService: DatabaseService) {

    }

    async createJob(user: User, companyId: number, body: CreateJobDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let customer = await this.databaseService.customer.findUnique({
                    where: {
                        id: body.customerId,
                        isDeleted: false,
                        companyId,
                    }
                });
                if (!customer) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let job = await this.databaseService.job.create({
                    data: {
                        description: body.description,
                        customerId: body.customerId,
                        status: JobStatus.OPEN,
                        companyId: company.id
                    },
                    omit: {
                        isDeleted: true
                    },
                    include: {
                        customer: {
                            omit: {
                                isDeleted: true
                            },
                        }
                    }
                });
                return { job }

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
    async getJobList(user: User, companyId: number, query: GetJobListDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                query.page = query.page === 0 ? 0 : query.page - 1
                let jobs = await this.databaseService.job.findMany({
                    where: {
                        companyId,
                        isClosed: query.closed || false,
                        isDeleted: false,
                        customer: {
                            name: {
                                contains: query.search,
                                mode: 'insensitive'
                            }
                        }

                    },
                    skip: query.page * query.limit,
                    take: query.limit,
                    omit: {
                        isDeleted: true
                    },
                    include: {
                        customer: {
                            omit: {
                                isDeleted: true
                            },
                        }
                    }
                });
                let totalCount = await this.databaseService.job.count({
                    where: {
                        companyId,
                        isClosed: query.closed || false,
                        isDeleted: false,
                        customer: {
                            name: {
                                contains: query.search,
                                mode: 'insensitive'
                            }
                        }

                    }
                });
                return { jobs, totalCount }
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
    async getJobDetails(user: User, companyId: number, jobId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let jobs = await this.databaseService.job.findUniqueOrThrow({
                    where: {
                        id: jobId,
                        companyId,
                        isDeleted: false,
                    },
                    omit: {
                        isDeleted: true
                    },
                    include: {
                        customer: {
                            omit: {
                                isDeleted: true
                            },
                        }
                    }
                });
                return { jobs }
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

    async updateJobStatusCalenderColorTemplate(
        user: User,
        companyId: number,
        jobId: number,
        body: UpdateJobStatusCalendarColorTemplateDto
    ) {
        try {
            // Check if User is Admin of the Company.
            if (
                user.userType == UserTypes.ADMIN ||
                (user.userType == UserTypes.BUILDER && user.companyId === companyId)
            ) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false,
                    },
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let job = await this.databaseService.job.findUniqueOrThrow({
                    where: {
                        id: jobId,
                        companyId,
                        isDeleted: false,
                    },
                    omit: {
                        isDeleted: true,
                    },
                });

                job.status = body.jobStatus;
                job.calendarColor = body.color;
                job.templateName = body.template;

                // updating the contractor
                let updatedJob = await this.databaseService.job.update({
                    where: {
                        id: jobId,
                        companyId,
                        isDeleted: false,
                    },
                    data: {
                        ...job,
                    },
                });

                return { updatedJob };
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
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

    async updateJob(
        user: User,
        companyId: number,
        jobId: number,
        body: UpdateJobDTO
    ) {
        try {
            // Check if User is Admin of the Company.
            if (
                user.userType == UserTypes.ADMIN ||
                (user.userType == UserTypes.BUILDER && user.companyId === companyId)
            ) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false,
                    },
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let job = await this.databaseService.job.findUniqueOrThrow({
                    where: {
                        id: jobId,
                        companyId,
                        isDeleted: false,
                    },
                    omit: {
                        isDeleted: true,
                    },
                });

                job.description = body.jobDescription;
                job.projectAddress = body.projectLocation;
                job.projectState = body.projectState;
                job.projectCity = body.projectCity;
                job.projectZip = body.projectZip;
                job.totalBudget = body.projectBudget;
                job.lotBudget = body.lotBudget;
                job.houseBudget = body.houseBudget;
                job.sizeOfHouse = body.houseSize;
                job.financing = body.financing;
                job.timeFrame = body.timeFrame;
                job.referral = body.hearAbout;
                job.startDate = body.startDate ? new Date(body.startDate) : null;
                job.endDate = body.endDate ? new Date(body.endDate) : null;
                job.isGasAtLot = body.isGas;
                job.isElectricityAtLot = body.isElectric;
                job.isWaterAtLot = body.isWater;
                job.isSewerAtLot = body.isSewer;

                // updating the contractor
                let updatedJob = await this.databaseService.job.update({
                    where: {
                        id: jobId,
                        companyId,
                        isDeleted: false,
                    },
                    data: {
                        ...job,
                    },
                });

                return { updatedJob };
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
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

    // delete a particular job
    async deleteJob(user: User, companyId: number, jobId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                // check job exist or not
                await this.databaseService.job.findFirstOrThrow({
                    where: {
                        id: jobId,
                        companyId,
                        isDeleted: false
                    }
                });
                await this.databaseService.job.update({
                    where: {
                        id: jobId,
                        companyId,
                    },
                    data: {
                        isDeleted: true
                    }

                })
                return { message: ResponseMessages.SUCCESSFUL }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // get the list of open jobs for calendar.
    async getOpenJobList(user: User, companyId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let jobs = await this.databaseService.job.findMany({
                    where: {
                        companyId,
                        isDeleted: false,
                        isClosed: false,
                        startDate: {
                            not: null,
                        },
                        endDate: {
                            not: null
                        }
                    },
                    omit: {
                        isDeleted: true
                    },
                    include: {
                        customer: {
                            omit: {
                                isDeleted: true
                            },
                        }
                    }
                });

                const openJobs = jobs.map(item => {
                    return {
                        id: item.id,
                        title: `${item.customer?.name}: ${item.description}`,
                        start: item.startDate,
                        end: item.endDate,
                        customerId: item.customer?.id,
                        color: item.calendarColor
                    };
                });
                return { openJobs }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {

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
