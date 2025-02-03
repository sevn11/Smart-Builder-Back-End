import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, PrismaClient, User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { CreateJobDTO, GetJobListDTO } from './validators';
import { DefaultArgs, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JobStatus, PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { UpdateJobStatusCalendarColorTemplateDto } from './validators/update-jobstatus-calendarcolor-template';
import { UpdateJobDTO } from './validators/update-job';
import { GoogleService } from 'src/core/services/google.service';
import { ProfitCalculationType } from 'src/core/utils/company';

@Injectable()
export class JobsService {

    constructor(private databaseService: DatabaseService, private googleService: GoogleService) {

    }

    async createJob(user: User, companyId: number, body: CreateJobDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId) || user.userType == UserTypes.EMPLOYEE) {
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
                let jobData = await this.databaseService.job.create({
                    data: {
                        descriptionId: body.description,
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
                        },
                        description: {
                            select: {
                                id: true,
                                name: true

                            }
                        }
                    }
                });
                let job = {
                    ...jobData,
                    descriptionId: jobData.description ? jobData.description.id : null,
                    description: jobData.description ? jobData.description.name : null
                }
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
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId) || user.userType == UserTypes.EMPLOYEE) {
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
                let jobdata = await this.databaseService.job.findMany({
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
                        },
                        description: {
                            select: {
                                id: true,
                                name: true

                            }
                        }
                    }
                });

                let jobs = jobdata.map(job => ({
                    ...job,
                    descriptionId: job.description ? job.description.id : null,
                    description: job.description ? job.description.name : null
                }));
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
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId) || user.userType == UserTypes.EMPLOYEE) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let jobsData = await this.databaseService.job.findUniqueOrThrow({
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
                        },
                        description: {
                            select: {
                                id: true,
                                name: true

                            }
                        }
                    }
                });
                let jobs = {
                    ...jobsData,
                    descriptionId: jobsData.description ? jobsData.description.id : null,
                    description: jobsData.description ? jobsData.description.name : null
                }
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
            if (
                user.userType == UserTypes.ADMIN ||
                (user.userType == UserTypes.BUILDER && user.companyId === companyId) ||
                user.userType == UserTypes.EMPLOYEE
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
                const templateId = job.templateId
                job.status = body.jobStatus;
                if (body.jobStatus == "OPEN") {
                    job.isClosed = false;
                } else {
                    job.isClosed = true;
                }
                job.calendarColor = body.color;
                job.templateId = body.template;

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

                // Reflect the change in google calendar also (if it's already synced)
                await this.updateJobInGoogleCalendar(user, updatedJob.id);

                if (!job.templateId || templateId != body.template) {
                    // Populate Project Estimator
                    await this.prepareCustomerTemplateData(updatedJob.templateId, companyId, updatedJob.id, job.customerId, templateId);
                }

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
            if (
                user.userType == UserTypes.ADMIN ||
                (user.userType == UserTypes.BUILDER && user.companyId === companyId) ||
                user.userType == UserTypes.EMPLOYEE
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

                job.descriptionId = body.jobDescription;
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
                job.startDate = body.startDate;
                job.endDate = body.endDate;
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

                // Reflect the change in google calendar also (if it's already synced)
                await this.updateJobInGoogleCalendar(user, updatedJob.id);

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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                // check job exist or not
                let job = await this.databaseService.job.findFirstOrThrow({
                    where: {
                        id: jobId,
                        companyId,
                        isDeleted: false
                    }
                });

                // Delete the job / project from google calendar also
                if (job.eventId) {
                    let event = await this.googleService.getEventFromGoogleCalendar(user, job);
                    if (event) {
                        await this.googleService.deleteCalendarEvent(user, job.eventId)
                    }
                }

                await this.databaseService.job.update({
                    where: {
                        id: jobId,
                        companyId,
                    },
                    data: {
                        isDeleted: true,
                        eventId: null
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
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId) || user.userType == UserTypes.EMPLOYEE) {
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
                        isClosed: false
                    },
                    omit: {
                        isDeleted: true
                    },
                    include: {
                        JobSchedule: {
                            where: {
                                isDeleted: false,
                            },
                            include: {
                                contractor: {
                                    include: {
                                        phase: true
                                    }
                                }
                            }
                        },
                        customer: {
                            omit: {
                                isDeleted: true
                            },
                        },
                        description: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                });

                const openJobs = await Promise.all(
                    jobs.map(async (item) => {
                        let isSynced = false;
                        if (item.eventId) {
                            let event = await this.googleService.getEventFromGoogleCalendar(user, item);
                            if (event) {
                                isSynced = true;
                            }
                        }
                        const jobEvent = {
                            id: item.id,
                            title: `${item.customer?.name}: ${item.description.name ?? ""}`,
                            start: item.startDate,
                            end: item.endDate,
                            customerId: item.customer?.id,
                            color: item.calendarColor,
                            isSynced,
                            isParent: true
                        };

                        const scheduleEvents = await Promise.all(item.JobSchedule.map(async (schedule) => {
                            let isScheduleSynced = false;
                            if (schedule.eventId) {
                                const event = await this.googleService.getEventFromGoogleCalendar(user, schedule);
                                if (event) {
                                    isScheduleSynced = true;
                                }
                            }

                            return {
                                id: schedule.id,
                                title: `${schedule.contractor.phase.name} - ${schedule.contractor.name} (${item.customer.name})`,
                                start: schedule.startDate,
                                end: schedule.endDate,
                                customerId: item.customer?.id,
                                contractorId: schedule.contractorId,
                                color: item.calendarColor,
                                isSynced: isScheduleSynced,
                                type: 'schedule',
                                jobId: jobEvent.id,
                                isChild: true,
                                parentId: item.id,
                                isScheduledOnWeekend: schedule.isScheduledOnWeekend,
                                duration: schedule.duration
                            };
                        }));

                        return [jobEvent, ...scheduleEvents];
                    })
                );
                const allEvents = openJobs.flat();
                return { openJobs: allEvents }
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

    async updateJobSalesStatus(
        user: User,
        companyId: number,
        jobId: number,
        body: { salesTaxStatus: boolean }
    ) {
        try {
            if (
                user.userType == UserTypes.ADMIN ||
                (user.userType == UserTypes.BUILDER && user.companyId === companyId) ||
                user.userType == UserTypes.EMPLOYEE
            ) {
                let job = await this.databaseService.job.findUnique({
                    where: {
                        id: jobId,
                        companyId,
                        isDeleted: false,
                    },
                });
                if (!job) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                await this.databaseService.job.update({
                    where: {
                        id: jobId,
                        companyId,
                        isDeleted: false,
                    },
                    data: {
                        ...body
                    }
                });

                return ResponseMessages.SUCCESSFUL;
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

    // Function to reflect the change in project / job in google calendar event also
    async updateJobInGoogleCalendar(user: User, jobId: number) {
        let latestJob = await this.databaseService.job.findFirst({
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

        // reflect the change in google calendar (if already synced)
        if (latestJob.eventId) {
            let event = await this.googleService.getEventFromGoogleCalendar(user, latestJob);
            if (event) {
                await this.googleService.syncToCalendar(user.id, latestJob, latestJob.eventId);
            }
        }
    }

    async getJobAndSchedules(user: User, companyId: number, jobId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId) || user.userType == UserTypes.EMPLOYEE) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let job = await this.databaseService.job.findUnique({
                    where: {
                        id: jobId,
                        companyId,
                        isDeleted: false,
                        isClosed: false
                    },
                    omit: {
                        isDeleted: true
                    },
                    include: {
                        JobSchedule: {
                            orderBy: {
                                startDate: 'asc'
                            },
                            where: {
                                isDeleted: false
                            },
                            include: {
                                contractor: {
                                    include: {
                                        phase: true
                                    }
                                }
                            },
                        },
                        customer: {
                            omit: {
                                isDeleted: true
                            },
                        },
                        description: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                });

                if (!job) {
                    return { error: 'Job not found' };
                }

                let isSynced = false;
                if (job.eventId) {
                    let event = await this.googleService.getEventFromGoogleCalendar(user, job);
                    if (event) {
                        isSynced = true;
                    }
                }
                let uniqueId = 1;
                const openJob = {
                    id: uniqueId,
                    jobId: job.id,
                    title: `${job.customer?.name}: ${job.description.name ?? ""}`,
                    start: job.startDate,
                    end: job.endDate,
                    customerId: job.customer?.id,
                    color: job.calendarColor,
                    isSynced,
                    type: "project"
                };

                // Check sync status for each schedule
                const schedulesWithSyncStatus = await Promise.all(
                    job.JobSchedule.map(async (schedule, index) => {
                        let isScheduleSynced = false;
                        if (schedule.eventId) {
                            let event = await this.googleService.getEventFromGoogleCalendar(user, schedule);
                            if (event) {
                                isScheduleSynced = true;
                            }
                        }
                        uniqueId += 1;
                        return {
                            id: uniqueId,
                            scheduleId: schedule.id,
                            title: `${schedule.contractor.phase.name} - ${schedule.contractor.name}`,
                            start: schedule.startDate,
                            end: schedule.endDate,
                            customerId: job.customer?.id,
                            contractorId: schedule.contractorId,
                            color: job.calendarColor,
                            isSynced: isScheduleSynced,
                            type: 'schedule',
                            dependencies: index > 0 ? [uniqueId - 1] : [],
                            isScheduledOnWeekend: schedule.isScheduledOnWeekend,
                            duration: schedule.duration
                        };
                    })
                );

                const result = [openJob, ...schedulesWithSyncStatus];

                return { jobAndSchedules: result };

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
    private async prepareCustomerTemplateData(templateId: number, companyId: number, jobId: number, customerId: number, oldTemplateId: number) {
        if (oldTemplateId) {
            await this.clearPreviousTemplateData(oldTemplateId, companyId, jobId, customerId);
        }

        const template = await this.databaseService.questionnaireTemplate.findUnique({
            where: { id: templateId, isDeleted: false },
            select: { id: true, projectEstimatorTemplateId: true }
        });

        if (!template) return;

        const customerTemplate = await this.databaseService.clientTemplate.create({
            data: {
                questionnaireTemplateId: template.id,
                projectEstimatorTemplateId: template.projectEstimatorTemplateId,
                isDeleted: false,
                jobId,
                customerId,
                companyId
            }
        })

        if (template.id && customerTemplate.id) {
            // Handle Questionnaire Template & Selction templates.
            await this.handleQuestionnaireTemplate(template.id, companyId, jobId, customerId, customerTemplate.id);
        }

        if (template.projectEstimatorTemplateId && customerTemplate.id) {
            await this.handleProjectEstimatorTemplate(template.projectEstimatorTemplateId, companyId, jobId, customerId, customerTemplate.id);
        }
    }

    private async clearPreviousTemplateData(oldTemplateId: number, companyId: number, jobId: number, customerId: number) {
        await this.databaseService.$transaction(async (tx) => {
            const questionnaireTemplate = await tx.questionnaireTemplate.findUnique({
                where: { id: oldTemplateId }
            });

            const templates = await tx.clientTemplate.findMany({
                where: { jobId, companyId, customerId, questionnaireTemplateId: questionnaireTemplate.id, projectEstimatorTemplateId: questionnaireTemplate.projectEstimatorTemplateId }
            });

            for (const element of templates) {
                await tx.clientTemplate.updateMany({
                    where: {
                        id: element.id
                    },
                    data: { isDeleted: true }
                });
                await tx.clientCategory.updateMany({
                    where: {
                        clientTemplateId: element.id,
                        customerId,
                        companyId,
                        jobId
                    },
                    data: {
                        isDeleted: true
                    }
                });
                await tx.clientTemplateQuestion.updateMany({
                    where: {
                        clientTemplateId: element.id,
                        jobId,
                        customerId,
                    },
                    data: { isDeleted: true }
                });
                const headers = await tx.jobProjectEstimatorHeader.findMany({
                    where: {
                        clientTemplateId: element.id,
                        jobId,
                        companyId
                    },
                });

                for (const header of headers) {
                    await tx.jobProjectEstimatorHeader.updateMany({
                        where: {
                            id: header.id,
                            clientTemplateId: element.id,
                            jobId,
                            companyId
                        },
                        data: { isDeleted: true }
                    }),
                        await tx.jobProjectEstimator.updateMany({
                            where: {
                                jobProjectEstimatorHeaderId: header.id
                            },
                            data: { isDeleted: true }
                        })
                }
            }
        });
    }

    private async handleQuestionnaireTemplate(templateId: number, companyId: number, jobId: number, customerId: number, customerTemplateId: number) {
        const questionnaireTemplate = await this.databaseService.questionnaireTemplate.findUnique({
            where: { id: templateId, companyId, isDeleted: false, isCompanyTemplate: true },
            include: {
                categories: {
                    where: { questionnaireTemplateId: templateId, isDeleted: false, companyId, isCompanyCategory: true },
                    orderBy: { id: "asc" },
                    include: { questions: { where: { isDeleted: false, }, orderBy: { id: "asc" } } }
                }
            }
        });
        // in case if not categories.
        if (!questionnaireTemplate || questionnaireTemplate.categories.length === 0) return;

        // Categories.
        const categories = questionnaireTemplate.categories;

        await this.databaseService.$transaction(async (tx) => {
            await Promise.all(categories.map(async (category) => {
                // Create client categories
                const categoryId = await tx.clientCategory.create({
                    data: {
                        clientTemplateId: customerTemplateId,
                        name: category.name,
                        isDeleted: category.isDeleted,
                        linkToPhase: category.linkToPhase,
                        phaseId: category.phaseId,
                        linkToInitalSelection: category.linkToInitalSelection,
                        linkToPaintSelection: category.linkToPaintSelection,
                        linkToQuestionnaire: category.linkToQuestionnaire,
                        isCompanyCategory: category.isCompanyCategory,
                        companyId: category.companyId,
                        questionnaireOrder: category.questionnaireOrder,
                        phaseIds: category.phaseIds,
                        initialOrder: category.initialOrder,
                        paintOrder: category.paintOrder,
                        customerId,
                        jobId,
                    }
                });

                // Category questions.
                const questions = category.questions;
                // Create questions.
                await this.createClientTemplateQuestions(tx, categoryId.id, questions, jobId, customerId, customerTemplateId);
            }));
        });
    }

    private async createClientTemplateQuestions(tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">, categoryId: number, questions: any[], jobId: number, customerId: number, customerTemplateId) {
        await Promise.all(questions.map(async (question) => {
            await tx.clientTemplateQuestion.create({
                data: {
                    isDeleted: question.isDeleted,
                    linkToPhase: question.linkToPhase,
                    linkToInitalSelection: question.linkToInitalSelection,
                    linkToPaintSelection: question.linkToPaintSelection,
                    linkToQuestionnaire: question.linkToQuestionnaire,
                    question: question.question,
                    questionType: question.questionType,
                    multipleOptions: question.multipleOptions,
                    clientCategoryId: categoryId,
                    phaseId: question.phaseId,
                    questionOrder: question.questionOrder,
                    customerId,
                    jobId,
                    phaseIds: question.phaseIds,
                    clientTemplateId: customerTemplateId,
                    initialQuestionOrder: question.initialQuestionOrder,
                    paintQuestionOrder: question.paintQuestionOrder
                }
            })
        }))
    }

    private async handleProjectEstimatorTemplate(templateId: number, companyId: number, jobId: number, customerId: number, customerTemplateId: number) {
        const template = await this.databaseService.projectEstimatorTemplate.findUnique({
            where: { id: templateId, isDeleted: false, companyId },
            include: {
                projectEstimatorTemplateHeader: {
                    where: { companyId, isDeleted: false, petId: templateId },
                    orderBy: { headerOrder: 'asc' },
                    include: {
                        ProjectEstimatorTemplateData: {
                            where: { isDeleted: false, },
                            orderBy: { order: 'asc' }
                        }
                    }
                }
            }
        });

        if (!template || template.projectEstimatorTemplateHeader.length === 0) return;

        const estimatorData = template.projectEstimatorTemplateHeader;

        await this.databaseService.$transaction(async (tx) => {
            await Promise.all(estimatorData.map(async (header) => {
                await tx.clientTemplate.update({
                    where: { id: customerTemplateId },
                    data: { accProfitCalculationType: template.profitCalculationType }
                })
                let projectHeader = await tx.jobProjectEstimatorHeader.create({
                    data: {
                        companyId,
                        jobId,
                        name: header.name,
                        clientTemplateId: customerTemplateId,
                        headerOrder: header.headerOrder
                    }
                });

                let estData = header.ProjectEstimatorTemplateData;
                let invoiceId = 1100;
                await Promise.all(estData.map(async (x) => {
                    let currentInvoiceId = null;
                    if (x.item == 'Change Order') {
                        currentInvoiceId = invoiceId;
                        invoiceId += 1;
                    }
                    await tx.jobProjectEstimator.create({
                        data: {
                            jobProjectEstimatorHeaderId: projectHeader.id,
                            item: x.item,
                            description: x.description,
                            costType: x.costType,
                            quantity: x.quantity,
                            unitCost: x.unitCost,
                            actualCost: x.actualCost,
                            grossProfit: x.grossProfit,
                            contractPrice: x.contractPrice,
                            order: x.order,
                            invoiceId: currentInvoiceId,
                            isLootCost: x.isLotCost
                        }
                    })
                }));
            }))
        })
    }
}
