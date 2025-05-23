import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Job, JobSchedule, JobScheduleLink, Prisma, PrismaClient, User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { TemplateDTO } from './validators/template';
import { PrismaErrorCodes, ResponseMessages, TemplateType, UserTypes } from 'src/core/utils';
import { DefaultArgs, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { EventDTO } from './validators/event';
import { ContractorAssignmentDTO } from './validators/contractor-assignment';
import { formatCalendarDate, formatEndDate, resetEventStart } from 'src/core/utils/date';
import { GoogleService } from 'src/core/services/google.service';
import { EventUpdateDTO } from './validators/update-event';

@Injectable()
export class CalendarTemplateService {
    constructor(private databaseService: DatabaseService, private googleService: GoogleService) { }

    async createTemplate(user: User, companyId: number, body: TemplateDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false,
                    }
                });

                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const createResponse = await this.databaseService.$transaction(async (tx) => {
                    const calendarTemplate = await tx.calendarTemplate.create({
                        data: {
                            name: body.name,
                            companyId,
                            isCompanyTemplate: true
                        }
                    });

                    const projectEstimatorTemplate = await tx.projectEstimatorTemplate.create({
                        data: {
                            templateName: body.name,
                            companyId,
                            profitCalculationType: company.profitCalculationType
                        }
                    });

                    await tx.questionnaireTemplate.create({
                        data: {
                            name: body.name,
                            companyId: company.id,
                            isCompanyTemplate: true,
                            templateType: TemplateType.CALENDAR,
                            projectEstimatorTemplateId: projectEstimatorTemplate.id,
                            calendarTemplateId: calendarTemplate.id
                        }
                    })

                    return { calendarTemplate }
                });

                return { template: createResponse?.calendarTemplate }
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

    async updateTemplate(user: User, companyId: number, templateId: number, body: TemplateDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
                const [company, template] = await Promise.all([
                    this.databaseService.company.findUnique({ where: { id: companyId, isDeleted: false } }),
                    this.databaseService.calendarTemplate.findUnique({ where: { id: templateId, isDeleted: false } })
                ]);

                if (!company) throw new ForbiddenException("Action Not Allowed");
                if (!template) throw new ForbiddenException("Template not found");

                const response = await this.databaseService.$transaction(async (tx) => {
                    const calendarTemplate = await tx.calendarTemplate.update({
                        where: { id: template.id, isDeleted: false },
                        data: { name: body.name }
                    });

                    const questionnaireTemplate = await tx.questionnaireTemplate.findFirst({
                        where: { calendarTemplateId: calendarTemplate.id, isDeleted: false }
                    });

                    if (questionnaireTemplate) {
                        await tx.questionnaireTemplate.update({
                            where: { id: questionnaireTemplate.id, isDeleted: false },
                            data: { name: body.name }
                        })
                        if (questionnaireTemplate && questionnaireTemplate.projectEstimatorTemplateId) {
                            await tx.projectEstimatorTemplate.update({
                                where: { id: questionnaireTemplate.projectEstimatorTemplateId, isDeleted: false },
                                data: { templateName: body.name }
                            })
                        }
                    }

                    return { calendarTemplate }
                })

                return { template: response.calendarTemplate, message: "Template updated successfully." }
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

    async deleteTemplate(user: User, companyId: number, templateId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {

                const [company, template] = await Promise.all([
                    this.databaseService.company.findUnique({ where: { id: companyId, isDeleted: false } }),
                    this.databaseService.calendarTemplate.findUnique({ where: { id: templateId, isDeleted: false } })
                ])

                if (!company) throw new ForbiddenException("Action Not Allowed");
                if (!template) throw new ForbiddenException("Template not found");

                const response = await this.databaseService.$transaction(async (tx) => {
                    const questionnaireTemplate = await tx.questionnaireTemplate.findFirst({
                        where: { calendarTemplateId: template.id }
                    });

                    if (questionnaireTemplate) {
                        const questionnaireTemplateId = questionnaireTemplate.id
                        await tx.questionnaireTemplate.update({
                            where: { id: questionnaireTemplateId, },
                            data: { isDeleted: true, }
                        });

                        await tx.category.updateMany({
                            where: { questionnaireTemplateId: questionnaireTemplateId },
                            data: { isDeleted: true, }
                        })
                        await tx.templateQuestion.updateMany({
                            where: { questionnaireTemplateId: questionnaireTemplateId },
                            data: { isDeleted: true, }
                        })
                    }

                    if (questionnaireTemplate.projectEstimatorTemplateId) {
                        const prEstId = questionnaireTemplate.projectEstimatorTemplateId;
                        const deleteHeaders = await tx.projectEstimatorTemplateHeader.findMany({
                            where: {
                                petId: prEstId, // The field you're using for filtering
                                isDeleted: false,
                            },
                            select: {
                                id: true, // Replace 'id' with the actual field name for your header ID
                            },
                        });
                        // delete header ids
                        const deletedHeaderIds = deleteHeaders.map(header => header.id);

                        if (deletedHeaderIds.length > 0) {
                            // delete all the template data.
                            const deletedData = await tx.projectEstimatorTemplateData.updateMany({
                                where: {
                                    petHeaderId: {
                                        in: deletedHeaderIds
                                    },
                                    isDeleted: false,
                                },
                                data: {
                                    isDeleted: true,
                                    order: 0
                                }
                            });

                            // delete all the headers.
                            const deletedHeaders = await tx.projectEstimatorTemplateHeader.updateMany({
                                where: {
                                    id: { in: deletedHeaderIds, },
                                    petId: prEstId,
                                    isDeleted: false,
                                    companyId
                                },
                                data: { isDeleted: true, headerOrder: 0 }
                            });
                        }

                        // delete the template
                        const deleteTemplate = await tx.projectEstimatorTemplate.update({
                            where: {
                                id: prEstId,
                                isDeleted: false,
                                companyId
                            },
                            data: {
                                isDeleted: true
                            }
                        });
                    }
                    if (questionnaireTemplate.calendarTemplateId) {
                        await tx.calendarTemplate.update({
                            where: { id: template.id },
                            data: { isDeleted: true }
                        });

                        await tx.calendarTemplateData.updateMany({
                            where: { ctId: template.id },
                            data: { isDeleted: true }
                        })
                    }

                    const calendarTemplate = await tx.calendarTemplate.findMany({
                        where: {
                            isDeleted: false,
                            companyId
                        }
                    });

                    return { calendarTemplate }
                });

                return response;

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

    async getTemplate(user: User, companyId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false,
                    }
                });

                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const calendarTemplate = await this.databaseService.calendarTemplate.findMany({
                    where: {
                        isDeleted: false,
                        companyId
                    }
                });

                return { calendarTemplate }

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

    async getTemplateData(user: User, companyId: number, templateId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
                const [company, calendarTemplate] = await Promise.all([
                    this.databaseService.company.findUnique({ where: { id: companyId, isDeleted: false } }),
                    this.databaseService.calendarTemplate.findMany({ where: { isDeleted: false, companyId } })
                ])

                if (!company) throw new ForbiddenException("Action Not Allowed");
                if (!calendarTemplate) throw new ForbiddenException("Calendar template not found.")

                const calendarTemplateData = await this.calendarTemplateData(companyId, templateId);

                return { calendarTemplateData }
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

    async createEvent(user: User, companyId: number, templateId: number, body: EventDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {

                const [company, template] = await Promise.all([
                    this.databaseService.company.findUnique({ where: { id: companyId, isDeleted: false } }),
                    this.databaseService.calendarTemplate.findUnique({ where: { id: templateId, isDeleted: false } })
                ]);

                if (!company) throw new ForbiddenException("Action Not Allowed");
                if (!template) throw new ForbiddenException("Calendar template not found.")

                let startDate = body.startDate;
                const endDate = formatEndDate(startDate, body.duration, body.isScheduledOnWeekend);
                await this.databaseService.calendarTemplateData.create({
                    data: {
                        companyId,
                        ctId: template.id,
                        isScheduledOnWeekend: body.isScheduledOnWeekend,
                        duration: body.duration,
                        phaseId: body.phaseId,
                        startDate: startDate,
                        endDate: endDate
                    }
                });

                const templateData = await this.calendarTemplateData(companyId, template.id);
                return { data: templateData }
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

    async deleteEvent(user: User, companyId: number, templateId: number, eventId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {

                const [company, template] = await Promise.all([
                    this.databaseService.company.findUnique({ where: { id: companyId, isDeleted: false } }),
                    this.databaseService.calendarTemplate.findUnique({ where: { id: templateId, isDeleted: false } }),
                ])

                if (!company) throw new ForbiddenException("Company not found.")
                if (!template) throw new ForbiddenException("Template not found");

                const event = await this.databaseService.calendarTemplateData.findUnique({
                    where: { id: eventId, ctId: template.id, isDeleted: false, companyId }
                })

                if (!event) throw new ForbiddenException("Event not found!")

                await this.databaseService.calendarTemplateData.update({
                    where: { id: eventId, ctId: template.id, companyId },
                    data: { isDeleted: true }
                })

                const templateData = await this.calendarTemplateData(companyId, templateId);

                return { message: 'Data removed successfully.', data: templateData }
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

    async updateEvent(user: User, companyId: number, templateId: number, eventId: number, body: EventUpdateDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
                const [company, template, event] = await Promise.all([
                    this.databaseService.company.findFirst({ where: { id: companyId, isDeleted: false } }),
                    this.databaseService.calendarTemplate.findFirst({ where: { id: templateId, isDeleted: false } }),
                    this.databaseService.calendarTemplateData.findFirst({ where: { id: eventId, ctId: templateId, isDeleted: false } })
                ]);
                if (!company) throw new ForbiddenException("Action not allowed");
                if (!template) throw new ForbiddenException("Template not found.")
                if (!event) throw new ForbiddenException("Event not found")

                body.startDate = `${body.startDate}Z`;
                body.endDate = `${body.endDate}Z`;

                await this.databaseService.calendarTemplateData.update({
                    where: { id: event.id, isDeleted: false },
                    data: {
                        duration: body.duration,
                        isScheduledOnWeekend: body.weekendschedule,
                        phaseId: body.phase,
                        startDate: body.startDate,
                        endDate: body.endDate
                    }
                });
                const calendarTemplateData = await this.calendarTemplateData(companyId, templateId)

                return { calendarTemplateData }
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

    async getTemplateDataGrouped(user: User, companyId: number, templateId: number, jobId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
                const [company, calendarTemplate, job] = await Promise.all([
                    this.databaseService.company.findUnique({ where: { id: companyId, isDeleted: false } }),
                    this.databaseService.calendarTemplate.findMany({ where: { isDeleted: false, companyId } }),
                    this.databaseService.job.findUnique({ where: { id: jobId, isDeleted: false, companyId } })
                ]);

                if (!company) throw new ForbiddenException("Action Not Allowed");
                if (!calendarTemplate) throw new ForbiddenException("Calendar template not found.")
                if (!job) throw new ForbiddenException("Job not found.")

                const groupedData = await this.calendarTemplateDataGrouped(companyId, templateId, job.id);

                return { data: groupedData };
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

    public async calendarTemplateData(companyId: number, templateId: number, group: boolean = false) {
        let templateData = await this.databaseService.calendarTemplateData.findMany({
            where: { companyId, ctId: templateId, isDeleted: false },
            include: {
                phase: {
                    select: { id: true, name: true, }
                },
            },
            omit: { createdAt: true, updatedAt: true },
            orderBy: { id: 'asc' }
        })

        const links = await this.databaseService.calendarTemplateDataLink.findMany({
            where: {
                templateId,
                isDeleted: false,
            },
            select: {
                id: true,
                sourceId: true,
                targetId: true,
                type: true,
            }
        })
        const ganttData = { tasks: templateData, links: links }
        return ganttData;
    }

    private async calendarTemplateDataGrouped(companyId: number, templateId: number, jobId: number) {
        let templateData = await this.databaseService.calendarTemplateData.findMany({
            where: { companyId, ctId: templateId, isDeleted: false },
            include: {
                phase: {
                    select: {
                        id: true, name: true
                    }
                },
            },
            omit: { createdAt: true, updatedAt: true },
            orderBy: { id: 'asc' }
        });

        const jobContractors = await this.databaseService.jobContractor.findMany({
            where: {
                companyId,
                jobId: jobId
            },
            include: {
                contractor: {
                    include: {
                        phase: {
                            select: { id: true, name: true }
                        }
                    }
                }
            }
        });

        const groupedData = templateData.map((tempData) => {
            const contractors = jobContractors
                .filter(({ contractor }) => contractor.phaseId === tempData.phaseId)
                .map(({ contractorId, contractor }) => ({
                    id: contractorId,
                    name: contractor.name,
                    email: contractor.email,
                    companyId: contractor.companyId
                }));

            return {
                ...tempData,
                contractors
            };
        });

        return groupedData;
    }

    async applyCalendarTemplate(user: User, companyId: number, templateId: number, jobId: number, body: ContractorAssignmentDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {

                const [company, template, job] = await Promise.all([
                    this.databaseService.company.findFirst({ where: { id: companyId, isDeleted: false } }),
                    this.databaseService.calendarTemplate.findFirst({ where: { id: templateId, isDeleted: false } }),
                    this.databaseService.job.findFirst({ where: { id: jobId, isDeleted: false, companyId } }),
                ]);

                if (!company) throw new ForbiddenException("Action Not Allowed");
                if (!template) throw new ForbiddenException("Calendar template not found.");
                if (!job) throw new ForbiddenException("Job not found.");

                const oldSchedules = await this.getOldSchedulesForCleanup(user, companyId, jobId);

                await this.databaseService.$transaction(async (tx) => {
                    await this.softDeleteOldSchedules(oldSchedules, tx);
                    await this.createScheduleWithLink(user, jobId, template.id, companyId, body.startDate, tx);
                    await tx.job.update({ where: { id: jobId }, data: { calendarTemplateApplied: true } })
                });

                await this.cleanupGoogleEvents(user, companyId, jobId, oldSchedules);

                return { message: 'Template applied successfully' }
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

    // Returns the old schedules when applying the templates.
    private async getOldSchedulesForCleanup(user: User, companyId: number, jobId: number) {
        const [job, jobSchedule, jobScheduleLink] = await Promise.all([
            await this.databaseService.job.findFirst({ where: { id: jobId, isDeleted: false, companyId } }),
            await this.databaseService.jobSchedule.findMany({ where: { jobId: jobId, isDeleted: false, companyId } }),
            await this.databaseService.jobScheduleLink.findMany({ where: { jobId: jobId, isDeleted: false, companyId } })
        ]);

        return { job, jobSchedule, jobScheduleLink }
    }

    // Update the isDeleted field
    private async softDeleteOldSchedules(
        oldSchedules: { job: Job, jobSchedule: JobSchedule[], jobScheduleLink: JobScheduleLink[] },
        tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
    ) {
        const { job, jobSchedule } = oldSchedules;
        if (!jobSchedule.length) return;

        const scheduleIds = jobSchedule.map((schedule) => schedule.id);

        await Promise.all([
            tx.jobScheduleLink.updateMany({
                where: { jobId: job.id, sourceId: { in: scheduleIds }, companyId: job.companyId },
                data: { isDeleted: true }
            }),
            tx.jobSchedule.updateMany({
                where: { id: { in: scheduleIds } },
                data: { isDeleted: true }
            })
        ])
    }

    private async createScheduleWithLink(
        user: User,
        jobId: number,
        templateId: number,
        companyId: number,
        startDate: string,
        tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
    ) {
        const userChosenStartDate = formatCalendarDate(new Date(startDate));

        const [templateDataLink, templateData] = await Promise.all([
            tx.calendarTemplateDataLink.findMany({
                where: { templateId, isDeleted: false },
                orderBy: { id: 'asc' }
            }),
            this.calendarTemplateDataGrouped(companyId, templateId, jobId)
        ]);

        const baseTemplateStartDate = new Date(Math.min(...templateData.map(data => new Date(data.startDate).getTime())));
        const getDayOffset = (from: Date, to: Date): number => Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

        const idMap = new Map<number, number[]>(); // templateData.id -> jobSchedule.id[]

        for (const data of templateData) {
            if (!data.contractors?.length) continue;
            const offsetDays = getDayOffset(baseTemplateStartDate, new Date(data.startDate));
            const adjustedStartDate = new Date(userChosenStartDate.getTime() + offsetDays * 86400000);
            const adjustedEndDate = formatEndDate(adjustedStartDate, data.duration, data.isScheduledOnWeekend);

            for (const contractor of data.contractors) {
                const jobSchedule = await tx.jobSchedule.create({
                    data: {
                        duration: data.duration,
                        isScheduledOnWeekend: data.isScheduledOnWeekend,
                        startDate: adjustedStartDate,
                        endDate: adjustedEndDate,
                        companyId,
                        jobId,
                        contractorId: contractor.id
                    }
                });

                if (!idMap.has(data.id)) idMap.set(data.id, []);
                idMap.get(data.id)!.push(jobSchedule.id);
            }
        }

        for (const link of templateDataLink) {
            const sourceIds = idMap.get(link.sourceId) || [];
            const targetIds = idMap.get(link.targetId) || [];

            for (const sourceId of sourceIds) {
                for (const targetId of targetIds) {
                    await tx.jobScheduleLink.create({
                        data: {
                            sourceId,
                            targetId,
                            companyId,
                            jobId,
                            type: link.type
                        }
                    })
                }
            }
        }
    }

    // Remove the google events
    private async cleanupGoogleEvents(user: User, companyId: number, jobId: number, oldSchedules: { job: Job, jobSchedule: JobSchedule[], jobScheduleLink: JobScheduleLink[] }) {
        const { jobSchedule } = oldSchedules;
        if (!jobSchedule.length) return;
        for (const schedule of jobSchedule) {
            const syncExist = await this.databaseService.googleEventId.findFirst({
                where: { userId: user.id, companyId, jobId, jobScheduleId: schedule.id },
                orderBy: { id: 'desc' },
                take: 1,
            });

            if (syncExist && syncExist?.eventId) {
                const event = await this.googleService.getEventFromGoogleCalendar(user, syncExist);
                if (event) {
                    await this.googleService.deleteCalendarEvent(user, syncExist.eventId);
                    await this.databaseService.googleEventId.update({
                        where: { id: syncExist.id },
                        data: { isDeleted: true }
                    })
                }
            }
            await this.googleService.removeScheduleFromOthers(user.id, companyId, schedule, oldSchedules.job);
        }
    }

    async updateCalendarTemplateFlag(user: User, companyId: number, templateId: number, jobId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
                const [company, template, job] = await Promise.all([
                    this.databaseService.company.findFirst({ where: { id: companyId, isDeleted: false } }),
                    this.databaseService.calendarTemplate.findFirst({ where: { id: templateId, isDeleted: false } }),
                    this.databaseService.job.findFirst({ where: { id: jobId, isDeleted: false, companyId } }),
                ]);

                if (!company) throw new ForbiddenException("Action Not Allowed");
                if (!template) throw new ForbiddenException("Calendar template not found.");
                if (!job) throw new ForbiddenException("Job not found.");


                const jobData = await this.databaseService.job.update({
                    where: { id: job.id },
                    data: { calendarTemplateApplied: true }
                });

                return { success: true };
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
