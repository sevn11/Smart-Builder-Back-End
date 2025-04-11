import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, PrismaClient, User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { TemplateDTO } from './validators/template';
import { PrismaErrorCodes, ResponseMessages, TemplateType, UserTypes } from 'src/core/utils';
import { DefaultArgs, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { EventDTO } from './validators/event';
import { ContractorAssignmentDTO } from './validators/contractor-assignment';
import { formatCalendarDate, formatEndDate } from 'src/core/utils/date';
import { GoogleService } from 'src/core/services/google.service';

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
                    const calendarTemplateService = await tx.calendarTemplate.create({
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
                            calendarTemplateId: calendarTemplateService.id
                        }
                    })

                    return { calendarTemplateService }
                });

                return { template: createResponse?.calendarTemplateService }
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

    async getTemplateDataGrouped(user: User, companyId: number, templateId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {

                const [company, calendarTemplate] = await Promise.all([
                    this.databaseService.company.findUnique({ where: { id: companyId, isDeleted: false } }),
                    this.databaseService.calendarTemplate.findMany({ where: { isDeleted: false, companyId } })
                ]);

                if (!company) throw new ForbiddenException("Action Not Allowed");
                if (!calendarTemplate) throw new ForbiddenException("Calendar template not found.")

                const calendarTemplateData = await this.calendarTemplateData(companyId, templateId, true);

                return { data: calendarTemplateData }
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

                await this.databaseService.calendarTemplateData.create({
                    data: {
                        companyId,
                        ctId: template.id,
                        isScheduledOnWeekend: body.isScheduledOnWeekend,
                        duration: body.duration,
                        phaseId: body.phaseId,
                        contractorIds: body.contractorIds
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

    async updateEvent(user: User, companyId: number, templateId: number, eventId: number, body: EventDTO) {
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

                await this.databaseService.calendarTemplateData.update({
                    where: { id: event.id, isDeleted: false },
                    data: { ...body }
                });
                const calendarTemplateData = await this.calendarTemplateData(companyId, templateId)
                return { calendarTemplateData };
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

                // Apply the contractors to the job.
                await this.databaseService.$transaction(async (tx) => {
                    await this.applyContractorsToJob(jobId, companyId, body.contractorIds, tx);
                    await this.createSchedules(user, jobId, companyId, body.startDate, body.contractorIds, tx);
                });

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

    private async calendarTemplateData(companyId: number, templateId: number, group: boolean = false) {

        const templateData = await this.databaseService.calendarTemplateData.findMany({
            where: {
                companyId,
                ctId: templateId,
                isDeleted: false,
            },
            include: {
                phase: {
                    select: {
                        id: true,
                        name: true,
                    }
                },

            },
            omit: {
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                id: 'asc'
            }
        });

        const contractorIds = templateData.flatMap(data => data.contractorIds || []);

        const contractors = await this.databaseService.contractor.findMany({
            where: { id: { in: contractorIds }, companyId, isDeleted: false, },
            omit: {
                createdAt: true,
                updatedAt: true,
                isDeleted: true,
            }
        });

        // Map contractors back to template data
        const finalData = templateData.map(data => ({
            ...data,
            contractors: contractors.filter(c => data.contractorIds.includes(c.id))
        }));


        if (group) {

            let groupedData = {};

            finalData.map((item) => {
                console.log(item);
                let phaseId = item.phase.id;

                if (!groupedData[phaseId]) {
                    groupedData[phaseId] = {

                        ctId: item.ctId,
                        phase: item.phase,
                        contractors: []
                    };
                }

                // Add duration to each contractor before pushing
                let contractorsWithDuration = item.contractors.map(contractor => ({
                    ...contractor,
                    eventId: item.id,
                    duration: item.duration,
                    isScheduledOnWeekend: item.isScheduledOnWeekend
                }));

                groupedData[phaseId].contractors.push(...contractorsWithDuration);
            });


            let result = Object.values(groupedData);

            return result;
        }

        return finalData;
    }

    private async applyContractorsToJob(jobId: number, companyId: number, contractorIds: { eventId: number, contractorGroups: number[] }[], tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) {
        for (const data of contractorIds) {
            for (const contractorId of data.contractorGroups) {
                const exists = await tx.jobContractor.findFirst({
                    where: { companyId, jobId, contractorId },
                });

                if (!exists) {
                    await tx.jobContractor.create({
                        data: { companyId, jobId, contractorId },
                    });
                }
            }
        }
    }

    private async createSchedules(
        user: User,
        jobId: number,
        companyId: number,
        startDate: string,
        contractorIds: { eventId: number, contractorGroups: number[] }[],
        tx: Prisma.TransactionClient
    ) {
        let scheduleStartDate = formatCalendarDate(new Date(startDate));

        // Remove the old calendar schedules.
        await this.removeOldSchedules(user, companyId, jobId);

        for (const data of contractorIds) {
            const calendarTemplateData = await tx.calendarTemplateData.findUnique({
                where: { id: data.eventId, isDeleted: false }
            });

            // If calendarTemplateData is not found, skip this iteration
            if (!calendarTemplateData) {
                console.warn(`No calendar template found for event ID: ${data.eventId}`);
                continue;
            }

            for (const contractorId of data.contractorGroups) {
                const scheduleEndDate = formatEndDate(
                    new Date(scheduleStartDate),
                    calendarTemplateData.duration,
                    calendarTemplateData.isScheduledOnWeekend
                );

                const payload = {
                    duration: calendarTemplateData.duration,
                    isScheduledOnWeekend: calendarTemplateData.isScheduledOnWeekend,
                    contractorId,
                    startDate: scheduleStartDate,
                    endDate: scheduleEndDate,
                    companyId,
                    jobId
                };

                scheduleStartDate = scheduleEndDate
                await tx.jobSchedule.create({
                    data: payload
                });
            }
        }
    }
    private async removeOldSchedules(
        user: User,
        companyId: number,
        jobId: number,
    ) {

        const job = await this.databaseService.job.findFirst({ where: { id: jobId } });
        const jobSchedules = await this.databaseService.jobSchedule.findMany({
            where: { jobId, isDeleted: false }
        });

        jobSchedules.map(async (schedule) => {
            await this.databaseService.jobSchedule.update({
                where: { id: schedule.id, jobId: job.id },
                data: { isDeleted: true }
            });

            await this.databaseService.jobScheduleLink.updateMany({
                where: { jobId: job.id, sourceId: schedule.id, companyId },
                data: { isDeleted: true }
            })

            const syncExist = await this.databaseService.googleEventId.findFirst({
                where: {
                    userId: user.id,
                    companyId: companyId,
                    jobId: job.id,
                    jobScheduleId: schedule.id,
                    isDeleted: false,
                },
                orderBy: { id: 'desc' },
                take: 1
            });

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

            await this.googleService.removeScheduleFromOthers(user.id, companyId, schedule, job);
        })
    }
}
