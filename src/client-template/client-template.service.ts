import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, TemplateType, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { ClientCategoryDTO } from './validators/client-category';
import { SelectionTemplates } from 'src/core/utils/selection-template';
import { ClientQuestionDTO } from './validators/client-question';

@Injectable()
export class ClientTemplateService {
    constructor(private databaseService: DatabaseService) { }

    // check company
    private async checkCompanyExist(companyId: number) {
        const company = await this.databaseService.company.findUnique({
            where: { id: companyId, isDeleted: false, }
        });
        if (!company) {
            throw new ForbiddenException('Company not found.')
        }
        return company;
    }

    // check job
    private async checkJobExist(jobId: number, companyId: number) {
        const job = await this.databaseService.job.findUnique({
            where: { id: jobId, isDeleted: false, companyId }
        })
        if (!job) {
            throw new ForbiddenException('Job not found.')
        }
        return job;
    }

    // check template
    private async checkTemplateExist(templateId: number, customerId: number, jobId: number, companyId: number,) {
        const template = await this.databaseService.clientTemplate.findUnique({
            where: {
                id: templateId,
                isDeleted: false,
                customerId,
                jobId,
                companyId
            }
        })

        if (!template) {
            throw new ForbiddenException('Template not found');
        }

        return template;
    }

    // check
    private async checkClientCategory(clientCategoryId: number, clientTemplateId: number, customerId: number, jobId: number, companyId: number,) {
        const clientCategory = await this.databaseService.clientCategory.findUnique({
            where: { id: clientCategoryId, isDeleted: false, clientTemplateId, customerId, jobId, companyId },
            include: {
                ClientTemplateQuestion: {
                    where: { isDeleted: false, clientTemplateId: clientTemplateId, jobId, customerId },
                    omit: { createdAt: true, updatedAt: true, },
                    orderBy: { questionOrder: 'asc' },
                }
            },
        });

        if (!clientCategory) {
            throw new ForbiddenException('Client Category not found.')
        }

        return clientCategory;
    }

    private async checkQuestion(questionId: number, categoryId: number, templateId: number, customerId: number, jobId: number, companyId: number) {
        const question = await this.databaseService.clientTemplateQuestion.findUnique({
            where: {
                id: questionId, isDeleted: false, clientCategoryId: categoryId, clientTemplateId: templateId, jobId, customerId
            },
        });

        if (!question) {
            throw new ForbiddenException('Question not found.')
        }

        return question;
    }

    // add category: Questionnaire & Selection
    async addCategory(user: User, companyId: number, jobId: number, type: string, templateId: number, body: ClientCategoryDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                const company = await this.checkCompanyExist(companyId);
                const job = await this.checkJobExist(jobId, companyId);
                const template = await this.checkTemplateExist(templateId, job.customerId, job.id, companyId);

                const maxOrder = await this.databaseService.clientCategory.aggregate({
                    _max: { questionnaireOrder: true, },
                    where: { clientTemplateId: template.id, isDeleted: false }
                });

                let order = body.questionnaireOrder === 0
                    ? (maxOrder._max.questionnaireOrder ?? 0) + 1
                    : body.questionnaireOrder;

                let selectionTypes = { linkToInitalSelection: false, linkToPaintSelection: false };
                if (body.isCategoryLinkedSelection && Array.isArray(body.linkedSelections)) {
                    selectionTypes = body.linkedSelections.reduce((acc: any, selection: string) => {
                        acc.linkToInitalSelection ||= selection === SelectionTemplates.INITIAL_SELECTION;
                        acc.linkToPaintSelection ||= selection === SelectionTemplates.PAINT_SELECTION;
                        return acc;
                    }, { ...selectionTypes });
                }

                if (type === SelectionTemplates.INITIAL_SELECTION.toLowerCase().replace(/ /g, "-")) {
                    selectionTypes.linkToInitalSelection = true;
                }
                if (type === SelectionTemplates.PAINT_SELECTION.toLowerCase().replace(/ /g, "-")) {
                    selectionTypes.linkToPaintSelection = true;
                }

                let clientCategory = await this.databaseService.clientCategory.create({
                    data: {
                        name: body.name,
                        isCompanyCategory: false,
                        companyId: company.id,
                        questionnaireOrder: order,
                        clientTemplateId: template.id,
                        linkToPhase: body.isCategoryLinkedPhase,
                        phaseIds: body.phaseIds,
                        linkToQuestionnaire: type === TemplateType.QUESTIONNAIRE.toLowerCase(),
                        customerId: job.customerId,
                        jobId,
                        ...selectionTypes
                    },
                })

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
                    where: { isDeleted: false, clientTemplateId: template.id, customerId: job.customerId, jobId, companyId, ...whereClause },
                    include: {
                        ClientTemplateQuestion: {
                            where: { isDeleted: false, clientTemplateId: template.id, jobId, customerId: job.customerId, ...whereClause },
                            omit: { createdAt: true, updatedAt: true, },
                            orderBy: { questionOrder: 'asc' },
                            include: {
                                answer: {
                                    where: {
                                        companyId, jobId: job.id, customerId: job.customerId, clientTemplateId: template.id
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { questionnaireOrder: 'asc' }
                });

                return { category: clientCategories, message: ResponseMessages.CATEGORY_ADDED_SUCCESSFULLY };
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
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

    // update category: Questionnaire & Selection
    async updateCategory(user: User, companyId: number, jobId: number, type: string, templateId: number, categoryId: number, body: ClientCategoryDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                const company = await this.checkCompanyExist(companyId);
                const job = await this.checkJobExist(jobId, companyId);
                const template = await this.checkTemplateExist(templateId, job.customerId, job.id, companyId);
                let clientCategory = await this.checkClientCategory(categoryId, template.id, job.customerId, job.id, companyId);

                let selectionTypes = { linkToInitalSelection: false, linkToPaintSelection: false };
                if (body.isCategoryLinkedSelection && Array.isArray(body.linkedSelections)) {
                    selectionTypes = body.linkedSelections.reduce((acc: any, selection: string) => {
                        acc.linkToInitalSelection ||= selection === SelectionTemplates.INITIAL_SELECTION;
                        acc.linkToPaintSelection ||= selection === SelectionTemplates.PAINT_SELECTION;
                        return acc;
                    }, { ...selectionTypes });
                }

                if (type === SelectionTemplates.INITIAL_SELECTION.toLowerCase().replace(/ /g, "-")) {
                    selectionTypes.linkToInitalSelection = true;
                }
                if (type === SelectionTemplates.PAINT_SELECTION.toLowerCase().replace(/ /g, "-")) {
                    selectionTypes.linkToPaintSelection = true;
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


                const category = await this.databaseService.clientCategory.update({
                    where: {
                        id: clientCategory.id,
                        isDeleted: false,
                        clientTemplateId: template.id,
                        jobId,
                        customerId: job.customerId,
                        companyId,
                        ...whereClause
                    },
                    data: {
                        name: body.name,
                        isCompanyCategory: false,
                        companyId: company.id,
                        clientTemplateId: template.id,
                        linkToPhase: body.isCategoryLinkedPhase,
                        phaseIds: body.phaseIds,
                        linkToQuestionnaire: type === TemplateType.QUESTIONNAIRE.toLowerCase(),
                        customerId: job.customerId,
                        jobId,
                        ...selectionTypes
                    },
                });

                const clientCategories = await this.databaseService.clientCategory.findMany({
                    where: { isDeleted: false, clientTemplateId: template.id, customerId: job.customerId, jobId, companyId, ...whereClause },
                    include: {
                        ClientTemplateQuestion: {
                            where: { isDeleted: false, clientTemplateId: template.id, jobId, customerId: job.customerId, ...whereClause },
                            omit: { createdAt: true, updatedAt: true, },
                            orderBy: { questionOrder: 'asc' },
                            include: {
                                answer: {
                                    where: {
                                        companyId, jobId: job.id, customerId: job.customerId, clientTemplateId: template.id
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { questionnaireOrder: 'asc' }
                });
                return { category: clientCategories, message: ResponseMessages.CATEGORY_UPDATED };
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.CATEGORY_UPDATED);
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

    // Todo: delete category: Questionnnaire & Selection
    async deleteCategory(user: User, type: string, companyId: number, jobId: number, templateId: number, categoryId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const company = await this.checkCompanyExist(companyId);
                const job = await this.checkJobExist(jobId, companyId);
                const template = await this.checkTemplateExist(templateId, job.customerId, job.id, companyId);
                let clientCategory = await this.checkClientCategory(categoryId, template.id, job.customerId, job.id, companyId);

                const deletedCategoryOrder = clientCategory.questionnaireOrder;

                await this.databaseService.$transaction([
                    this.databaseService.clientCategory.update({
                        where: {
                            id: categoryId,
                            clientTemplateId: templateId,
                            companyId,
                            isDeleted: false,
                            jobId,
                            customerId: job.customerId,
                        },
                        data: { isDeleted: true, questionnaireOrder: 0 }
                    }),
                    this.databaseService.clientTemplateQuestion.updateMany({
                        where: {
                            clientTemplateId: template.id,
                            isDeleted: false,
                            clientCategoryId: categoryId,
                            jobId,
                            customerId: job.customerId
                        },
                        data: { isDeleted: true }
                    }),
                    this.databaseService.clientCategory.updateMany({
                        where: {
                            clientTemplateId: templateId,
                            companyId,
                            isDeleted: false,
                            jobId,
                            customerId: job.customerId,
                            questionnaireOrder: {
                                gt: deletedCategoryOrder
                            }
                        },
                        data: {
                            questionnaireOrder: {
                                decrement: 1
                            }
                        }
                    })
                ]);

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
                    where: { isDeleted: false, clientTemplateId: template.id, customerId: job.customerId, jobId, companyId, ...whereClause },
                    include: {
                        ClientTemplateQuestion: {
                            where: { isDeleted: false, clientTemplateId: template.id, jobId, customerId: job.customerId, ...whereClause },
                            omit: { createdAt: true, updatedAt: true, },
                            orderBy: { questionOrder: 'asc' },
                            include: {
                                answer: {
                                    where: {
                                        companyId, jobId: job.id, customerId: job.customerId, clientTemplateId: template.id
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { questionnaireOrder: 'asc' }
                });
                return { category: clientCategories, message: ResponseMessages.CATEGORY_DELETED }

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
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

    // Create Question: Questionnaire & Selection
    async createQuestion(user: User, type: string, companyId: number, jobId: number, templateId: number, categoryId: number, body: ClientQuestionDTO) {
        try {

            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                const company = await this.checkCompanyExist(companyId);
                const job = await this.checkJobExist(jobId, companyId);
                const template = await this.checkTemplateExist(templateId, job.customerId, job.id, companyId);
                let clientCategory = await this.checkClientCategory(categoryId, template.id, job.customerId, job.id, companyId);

                let maxOrder = await this.databaseService.clientTemplateQuestion.aggregate({
                    _max: {
                        questionOrder: true,
                    },
                    where: {
                        clientTemplateId: templateId,
                        clientCategoryId: categoryId,
                        customerId: job.customerId,
                        jobId: job.id,
                        isDeleted: false,
                    }
                });

                let order = body.questionOrder === 0
                    ? (maxOrder._max.questionOrder ?? 0) + 1
                    : body.questionOrder

                // set the update data.
                let updateData = {
                    ...(body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION) && !clientCategory.linkToInitalSelection && { linkToInitalSelection: true }),
                    ...(body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION) && !clientCategory.linkToPaintSelection && { linkToPaintSelection: true })
                };

                const question = await this.databaseService.clientTemplateQuestion.create({
                    data: {
                        question: body.question,
                        questionType: body.type,
                        multipleOptions: body.multipleOptions,
                        linkToPhase: body.isQuestionLinkedPhase,
                        questionOrder: order,
                        linkToQuestionnaire: type === TemplateType.QUESTIONNAIRE.toLocaleLowerCase(),
                        linkToInitalSelection: body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION),
                        linkToPaintSelection: body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION),
                        clientTemplateId: templateId,
                        clientCategoryId: categoryId,
                        phaseIds: body.phaseIds,
                        customerId: job.customerId,
                        jobId: job.id,
                        ...updateData
                    },
                    omit: {
                        isDeleted: true,
                        clientTemplateId: true,
                        clientCategoryId: true
                    }
                });

                let whereClause: any = {};
                if (type === 'initial-selection') {
                    whereClause.linkToInitalSelection = true;
                }
                if (type === 'paint-selection') {
                    whereClause.linkToPaintSelection = true
                }

                if (type === 'questionnaire') {
                    whereClause.linkToQuestionnaire = true
                }

                const clientCategories = await this.databaseService.clientCategory.findMany({
                    where: { isDeleted: false, clientTemplateId: template.id, customerId: job.customerId, jobId, companyId, ...whereClause },
                    include: {
                        ClientTemplateQuestion: {
                            where: { isDeleted: false, clientTemplateId: template.id, jobId, customerId: job.customerId, ...whereClause },
                            omit: { createdAt: true, updatedAt: true, },
                            orderBy: { questionOrder: 'asc' },
                            include: {
                                answer: {
                                    where: {
                                        companyId, jobId: job.id, customerId: job.customerId, clientTemplateId: template.id
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { questionnaireOrder: 'asc' }
                });
                return { category: clientCategories, message: ResponseMessages.QUESTION_ADDED }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
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

    // Edit Question: Questionnaire & Selection
    async editQuestion(user: User, type: string, companyId: number, jobId: number, templateId: number, categoryId: number, questionId: number, body: ClientQuestionDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                const company = await this.checkCompanyExist(companyId);
                const job = await this.checkJobExist(jobId, companyId);
                const template = await this.checkTemplateExist(templateId, job.customerId, job.id, companyId);
                let clientCategory = await this.checkClientCategory(categoryId, template.id, job.customerId, job.id, companyId);
                let question = await this.checkQuestion(questionId, clientCategory.id, template.id, job.customerId, job.id, companyId);

                const updateData = {
                    ...(body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION) && !clientCategory.linkToInitalSelection && { linkToInitalSelection: true }),
                    ...(body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION) && !clientCategory.linkToPaintSelection && { linkToPaintSelection: true })
                };

                if (!clientCategory.linkToInitalSelection || !clientCategory.linkToPaintSelection) {
                    if (Object.keys(updateData).length > 0) {
                        const cat = await this.databaseService.clientCategory.update({
                            where: {
                                id: clientCategory.id,
                                isDeleted: false,
                            },
                            data: updateData
                        });
                    }
                }

                const res = await this.databaseService.clientTemplateQuestion.update({
                    where: {
                        id: questionId, isDeleted: false, clientCategoryId: categoryId, clientTemplateId: templateId, jobId, customerId: job.customerId
                    },
                    data: {
                        question: body.question,
                        questionType: body.type,
                        multipleOptions: body.multipleOptions,
                        linkToPhase: body.isQuestionLinkedPhase,
                        linkToInitalSelection: body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION),
                        linkToPaintSelection: body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION),
                        clientTemplateId: templateId,
                        clientCategoryId: categoryId,
                        phaseIds: body.phaseIds,
                        customerId: job.customerId,
                        jobId: job.id,
                        ...updateData
                    },
                    omit: {
                        isDeleted: true,
                        clientTemplateId: true,
                        clientCategoryId: true
                    }
                });

                let whereClause: any = {};
                if (type === 'initial-selection') {
                    whereClause.linkToInitalSelection = true;
                }
                if (type === 'paint-selection') {
                    whereClause.linkToPaintSelection = true
                }

                if (type === 'questionnaire') {
                    whereClause.linkToQuestionnaire = true
                }

                const clientCategories = await this.databaseService.clientCategory.findMany({
                    where: { isDeleted: false, clientTemplateId: template.id, customerId: job.customerId, jobId, companyId, ...whereClause },
                    include: {
                        ClientTemplateQuestion: {
                            where: { isDeleted: false, clientTemplateId: template.id, jobId, customerId: job.customerId, ...whereClause },
                            omit: { createdAt: true, updatedAt: true, },
                            orderBy: { questionOrder: 'asc' },
                            include: {
                                answer: {
                                    where: {
                                        companyId, jobId: job.id, customerId: job.customerId, clientTemplateId: template.id
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { questionnaireOrder: 'asc' }
                });
                return { category: clientCategories, message: ResponseMessages.QUESTION_UPDATED }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
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

    // Delete Question: Questionnaire & Selection
    async deleteQuestion(user: User, type: string, companyId: number, jobId: number, templateId: number, categoryId: number, questionId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                const company = await this.checkCompanyExist(companyId);
                const job = await this.checkJobExist(jobId, companyId);
                const template = await this.checkTemplateExist(templateId, job.customerId, job.id, companyId);
                let clientCategory = await this.checkClientCategory(categoryId, template.id, job.customerId, job.id, companyId);
                let question = await this.checkQuestion(questionId, clientCategory.id, template.id, job.customerId, job.id, companyId);

                const deleteQuestionOrder = question.questionOrder;
                let whereClause: any = {};
                if (type === 'initial-selection') {
                    whereClause.linkToInitalSelection = true;
                }
                if (type === 'paint-selection') {
                    whereClause.linkToPaintSelection = true
                }

                if (type === 'questionnaire') {
                    whereClause.linkToQuestionnaire = true
                }
                await this.databaseService.$transaction([
                    this.databaseService.clientTemplateQuestion.update({
                        where: { id: question.id },
                        data: { isDeleted: true, questionOrder: 0 }
                    }),
                    this.databaseService.clientTemplateQuestion.updateMany({
                        where: {
                            clientTemplateId: template.id,
                            clientCategoryId: categoryId,
                            isDeleted: false,
                            questionOrder: {
                                gt: deleteQuestionOrder
                            }
                        },
                        data: {
                            questionOrder: { decrement: 1 }
                        }
                    })
                ])



                const clientCategories = await this.databaseService.clientCategory.findMany({
                    where: { isDeleted: false, clientTemplateId: template.id, customerId: job.customerId, jobId, companyId, ...whereClause },
                    include: {
                        ClientTemplateQuestion: {
                            where: { isDeleted: false, clientTemplateId: template.id, jobId, customerId: job.customerId, ...whereClause },
                            omit: { createdAt: true, updatedAt: true, },
                            orderBy: { questionOrder: 'asc' },
                            include: {
                                answer: {
                                    where: {
                                        companyId, jobId: job.id, customerId: job.customerId, clientTemplateId: template.id
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { questionnaireOrder: 'asc' }
                });
                return { category: clientCategories, message: ResponseMessages.QUESTION_DELETED }

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
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
