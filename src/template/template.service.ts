import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Job, User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { QuestionAnswerDTO } from './validators/answer';

@Injectable()
export class TemplateService {
    constructor(private databaseService: DatabaseService) { }

    // Get the template names which is linked on all three templates.
    async getTemplate(user: User, companyId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const response = await this.databaseService.questionnaireTemplate.findMany({
                    where: {
                        isDeleted: false,
                        companyId,
                        projectEstimatorTemplateId: {
                            not: null
                        }
                    }
                });

                return { templates: response }
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
            }
            throw new InternalServerErrorException();
        }
    }

    // get template data
    async getTemplateData(user: User, companyId: number, type: string, jobId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const job = await this.databaseService.job.findUnique({
                    where: { id: jobId, companyId, isDeleted: false },
                    select: { id: true, templateId: true, customerId: true }
                });

                if (!job || !job.templateId) {
                    throw new ForbiddenException('Please select a template in the customer information page.')
                }
                return this.getTemplateContent(type, job.templateId, companyId, job.customerId, job.id);
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.QUESTION_NOT_FOUND);
                else {
                    console.log(error.code)
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // Create answer records api
    async createAnswer(user: User, companyId: number, templateId: number, questionId: number, categoryId: number, body: QuestionAnswerDTO, type: string) {
        try {
            // Check user permissions
            if (![UserTypes.ADMIN, UserTypes.BUILDER].includes(user.userType)) {
                throw new ForbiddenException("Action Not Allowed");
            }

            // For Builder, check if company matches
            if (user.userType === UserTypes.BUILDER && user.companyId !== companyId) {
                throw new ForbiddenException("Action Not Allowed");
            }

            let [template, job, category] = await Promise.all([
                this.databaseService.clientTemplate.findUnique({
                    where: { id: templateId, isDeleted: false, }
                }),
                this.databaseService.job.findUnique({
                    where: { id: body.jobId, isDeleted: false }
                }),
                this.databaseService.clientCategory.findUnique({
                    where: { id: categoryId, isDeleted: false, clientTemplateId: templateId, companyId }
                })
            ]);

            if (!job || !template || !category) {
                throw new ForbiddenException('Job, Category or Template not found.');
            }

            const customer = await this.databaseService.customer.findUnique({
                where: { id: job.customerId, isDeleted: false }
            })
            if (!customer) {
                throw new ForbiddenException('Customer not found.');
            }
            let existingAnswer = await this.databaseService.clientQuestionAnswer.findFirst({
                where: { questionId, jobId: job.id, customerId: customer.id, clientTemplateId: template.id, clientCategoryId: category.id }
            })

            // Create or update the answer
            const answerData = {
                questionId,
                answerIds: body.answerIds,
                answerText: body.answerText,
                companyId,
                jobId: job.id,
                clientTemplateId: template.id,
                clientCategoryId: category.id,
                customerId: customer.id
            };


            if (!existingAnswer) {
                existingAnswer = await this.databaseService.clientQuestionAnswer.create({ data: answerData });
            } else {
                existingAnswer = await this.databaseService.clientQuestionAnswer.update({
                    where: {
                        id: existingAnswer.id
                    },
                    data: answerData
                });
            }

            let whereClause: any = {};
            if (type === 'initial-selection') {
                whereClause.linkToInitalSelection = true;
            }

            if (type === 'paint-selection') {
                whereClause.linkToPaintSelection = true;
            }

            if (type === 'questionnaire') {
                whereClause.linkToQuestionnaire = true;
            }

            const clientCategories = await this.databaseService.clientCategory.findMany({
                where: { isDeleted: false, clientTemplateId: template.id, customerId: job.customerId, jobId: job.id, companyId, ...whereClause },
                include: {
                    ClientTemplateQuestion: {
                        where: { isDeleted: false, clientTemplateId: template.id, jobId: job.id, customerId: job.customerId, ...whereClause },
                        omit: { createdAt: true, updatedAt: true, },
                        orderBy: { questionOrder: 'asc' },
                        include: {
                            answer: {
                                where: {
                                    clientTemplateId: templateId,
                                    companyId,
                                    customerId: customer.id,
                                    jobId: job.id,
                                }
                            }
                        }
                    },
                },
                orderBy: { questionnaireOrder: 'asc' }
            });

            return { category: clientCategories, message: ResponseMessages.ANSWER_UPDATED_SUCCESSFULLY }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code)
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // get the template content
    private async getTemplateContent(type: string, templateId: number, companyId: number, customerId: number, jobId: number) {
        const template = await this.databaseService.questionnaireTemplate.findUnique({
            where: { id: templateId },
            select: { id: true, projectEstimatorTemplateId: true, }
        });

        if (!template) {
            throw new ForbiddenException('Template not found.');
        }

        const clientTemplate = await this.databaseService.clientTemplate.findFirst({
            where: {
                questionnaireTemplateId: template.id,
                projectEstimatorTemplateId: template.projectEstimatorTemplateId,
                isDeleted: false,
                companyId,
                customerId,
                jobId
            },
            orderBy: { id: 'desc' },
            take: 1,
        });

        if (!clientTemplate) {
            throw new ForbiddenException('Template not found.')
        }

        switch (type) {
            case 'questionnaire':
                return this.getQuestionnaireTemplate(clientTemplate.id, companyId, customerId, jobId);

            case 'initial-selection':
                return this.getSelectionTemplate('initial', clientTemplate.id, companyId, customerId, jobId);

            case 'paint-selection':
                return this.getSelectionTemplate('paint', clientTemplate.id, companyId, customerId, jobId);

            case 'project-estimator':
                return this.getJobProjectEstimator(clientTemplate.id, companyId, customerId, jobId);

            default:
                return { template: [] }
        }
    }

    // Get the questionnaire template data wrt templateid
    private async getQuestionnaireTemplate(templateId: number, companyId: number, customerId: number, jobId: number) {
        const clientTemplate = await this.databaseService.clientTemplate.findFirst({
            where: { id: templateId, isDeleted: false, companyId, customerId, jobId },
            orderBy: { id: 'desc' },
            take: 1,
            include: {
                clientCategory: {
                    where: { isDeleted: false, linkToQuestionnaire: true, clientTemplateId: templateId, companyId, jobId, customerId },
                    omit: { createdAt: true, updatedAt: true, },
                    orderBy: { questionnaireOrder: 'asc' },
                    include: {
                        ClientTemplateQuestion: {
                            where: { isDeleted: false, linkToQuestionnaire: true, clientTemplateId: templateId, jobId, customerId },
                            omit: { createdAt: true, updatedAt: true, },
                            orderBy: { questionOrder: 'asc' },
                            include: {
                                answer: {
                                    where: { clientTemplateId: templateId, jobId, companyId, customerId },
                                    omit: { createdAt: true, updatedAt: true }
                                }
                            }
                        }
                    }
                }
            }
        })

        return { template: clientTemplate || {} }
    }

    private async getSelectionTemplate(type: string, templateId: number, companyId: number, customerId: number, jobId: number) {
        let whereClause: any = {};
        if (type === 'initial') { whereClause.linkToInitalSelection = true }
        if (type === 'paint') { whereClause.linkToPaintSelection = true }

        let selectionTemplate = await this.databaseService.clientTemplate.findFirst({
            where: { id: templateId, isDeleted: false, companyId, customerId, jobId },
            orderBy: { id: 'desc' },
            take: 1,
            include: {
                clientCategory: {
                    where: { isDeleted: false, clientTemplateId: templateId, ...whereClause, companyId, jobId, customerId },
                    omit: { createdAt: true, updatedAt: true, },
                    orderBy: { questionnaireOrder: 'asc' },
                    include: {
                        ClientTemplateQuestion: {
                            where: { isDeleted: false, clientTemplateId: templateId, ...whereClause, jobId, customerId },
                            omit: { createdAt: true, updatedAt: true, },
                            orderBy: { questionOrder: 'asc' },
                            include: {
                                answer: {
                                    where: { clientTemplateId: templateId, jobId, companyId, customerId },
                                    omit: { createdAt: true, updatedAt: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        return { template: selectionTemplate || {} }
    }

    private async getJobProjectEstimator(templateId: number, companyId: number, customerId: number, jobId: number) {
        let prData = await this.databaseService.clientTemplate.findFirst({
            where: { id: templateId, isDeleted: false, companyId, customerId, jobId },
            orderBy: { id: 'desc' },
            take: 1,
            include: {
                jobProjectEstimatorHeader: {
                    where: {
                        clientTemplateId: templateId,
                        isDeleted: false,
                        companyId,
                        jobId
                    },
                    select: {
                        id: true,
                        name: true,
                        companyId: true,
                        jobId: true,
                        isDeleted: true,
                        headerOrder: true,
                        JobProjectEstimator: {
                            where: {
                                isDeleted: false
                            },
                            select: {
                                id: true,
                                item: true,
                                description: true,
                                costType: true,
                                quantity: true,
                                unitCost: true,
                                actualCost: true,
                                grossProfit: true,
                                contractPrice: true,
                                invoiceId: true,
                                isLootCost: true,
                                isDeleted: true,
                                jobProjectEstimatorHeaderId: true,
                                order: true
                            },
                            orderBy: {
                                order: 'asc'
                            }
                        }
                    },
                    orderBy: {
                        headerOrder: 'asc'
                    }
                }
            }
        });

        const data = prData.jobProjectEstimatorHeader.filter(header => header.name !== 'Statements');
        const projectEstimatorData = data.map(item => ({
            ...item,
            JobProjectEstimator: item.JobProjectEstimator.map(estimator => ({
                ...estimator,
                unitCost: Number(estimator.unitCost).toFixed(2),
                actualCost: Number(estimator.actualCost).toFixed(2),
                grossProfit: Number(estimator.grossProfit).toFixed(2),
                contractPrice: Number(estimator.contractPrice).toFixed(2),
            }))
        }));
        return { projectEstimatorData };
    }
}