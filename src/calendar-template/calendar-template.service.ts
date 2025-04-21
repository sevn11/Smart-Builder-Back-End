import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Company, Prisma, PrismaClient, User } from '@prisma/client';
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

    async createEvent(user: User, companyId: number, templateId: number, body: EventDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {

                const [company, template] = await Promise.all([
                    this.databaseService.company.findUnique({ where: { id: companyId, isDeleted: false } }),
                    this.databaseService.calendarTemplate.findUnique({ where: { id: templateId, isDeleted: false } })
                ]);

                if (!company) throw new ForbiddenException("Action Not Allowed");
                if (!template) throw new ForbiddenException("Calendar template not found.")

                const insertData = body.contractorIds.map(contractorId => ({
                    companyId,
                    ctId: template.id,
                    isScheduledOnWeekend: body.isScheduledOnWeekend,
                    duration: body.duration,
                    contractorId,
                    phaseId: body.phaseId
                }));

                await this.databaseService.calendarTemplateData.createMany({
                    data: insertData
                })

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

                const contractor = await this.databaseService.contractor.findUnique({ where: { id: body.contractor } });

                await this.databaseService.calendarTemplateData.update({
                    where: { id: event.id, isDeleted: false },
                    data: {
                        contractorId: body.contractor,
                        duration: body.duration,
                        isScheduledOnWeekend: body.weekendschedule,
                        phaseId: contractor.phaseId
                    }
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

                body.eventIds.sort((a: number, b: number) => a - b)

                const contractorData = await this.databaseService.calendarTemplateData.findMany({
                    where: { id: { in: body.eventIds } },
                    select: { contractorId: true }
                })

                const contractorIds = contractorData.map(item => item.contractorId);

                await this.databaseService.$transaction(async (tx) => {
                    await this.applyContractorsToJob(jobId, company, contractorIds, tx);
                    await this.createSchedules(user, jobId, companyId, body.startDate, body.eventIds, tx);
                })

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

    async createSchedules(user: User, jobId: number, companyId: number, startDate: string, eventIds: number[], tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) {
        let scheduleStartDate = formatCalendarDate(new Date(startDate));

        await this.removeOldSchedules(user, companyId, jobId, tx);
        for (const eventId of eventIds) {
            const calendarTemplateData = await tx.calendarTemplateData.findUnique({
                where: { id: eventId, isDeleted: false }
            });

            if (!calendarTemplateData) {
                console.warn(`No calendar template found for ID: ${eventId}`);
                continue;
            }

            const scheduleEndDate = formatEndDate(
                new Date(scheduleStartDate),
                calendarTemplateData.duration,
                calendarTemplateData.isScheduledOnWeekend
            );

            const payload = {
                duration: calendarTemplateData.duration,
                isScheduledOnWeekend: calendarTemplateData.isScheduledOnWeekend,
                contractorId: calendarTemplateData.contractorId,
                startDate: scheduleStartDate,
                companyId,
                jobId,
                endDate: scheduleEndDate
            }

            scheduleStartDate = resetEventStart(scheduleEndDate);

            const jobSchedule = await tx.jobSchedule.create({
                data: payload
            });
        }

        return true;
    }

    async applyContractorsToJob(jobId: number, company: Company, contractorIds: number[], tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) {
        for (const contractorId of contractorIds) {
            const contractor = await tx.jobContractor.findFirst({
                where: { companyId: company.id, jobId, contractorId },
            })
            if (!contractor) {
                await tx.jobContractor.create({
                    data: { companyId: company.id, jobId, contractorId }
                })
            }
        }

        return true;
    }

    async removeOldSchedules(user: User, companyId: number, jobId: number, tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) {
        const job = await tx.job.findFirst({ where: { id: jobId } });
        const jobSchedule = await tx.jobSchedule.findMany({
            where: { jobId, isDeleted: false }
        })

        jobSchedule.map(async (schedule) => {
            await tx.jobSchedule.update({
                where: { id: schedule.id, jobId: job.id },
                data: { isDeleted: true }
            });

            await tx.jobScheduleLink.updateMany({
                where: { jobId: job.id, sourceId: schedule.id, companyId },
                data: { isDeleted: true }
            });

            const syncExist = await tx.googleEventId.findFirst({
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

    private async calendarTemplateData(companyId: number, templateId: number, group: boolean = false) {
        let templateData = await this.databaseService.calendarTemplateData.findMany({
            where: { companyId, ctId: templateId, isDeleted: false },
            include: {
                phase: {
                    select: { id: true, name: true, }
                },
                contractor: {
                    select: { id: true, name: true, email: true }
                }
            },
            omit: { createdAt: true, updatedAt: true },
            orderBy: { id: 'asc' }
        })

        if (group) {
            const groupedTemplateData = Object.values(
                templateData.reduce((acc, item) => {
                    const phaseId = item.phaseId;

                    if (!acc[phaseId]) {
                        acc[phaseId] = {
                            phase: item.phase,
                            data: []
                        };
                    }

                    acc[phaseId].data.push(item);
                    return acc;
                }, {})
            );

            return groupedTemplateData;
        }
        return templateData;
    }

    async getContractors(user: User, companyId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
                const company = await this.databaseService.company.findFirst({
                    where: { id: companyId, isDeleted: false }
                })

                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const contractors = await this.databaseService.contractor.findMany({
                    where: {
                        companyId,
                        isDeleted: false,
                    },
                    omit: { createdAt: true, updatedAt: true },
                    include: {
                        phase: true
                    }
                });

                return { contractors }
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
