import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, TemplateType, TemplateTypeValue, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { ClientCategoryDTO } from './validators/client-category';
import { SelectionTemplates } from 'src/core/utils/selection-template';
import { ClientQuestionDTO } from './validators/client-question';
import { ProfitCalculationTypeEnum } from 'src/core/utils/profit-calculation';

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
            throw new ForbiddenException('Project not found.')
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
    async addCategory(user: User, companyId: number, jobId: number, type: TemplateTypeValue, templateId: number, body: ClientCategoryDTO) {
        try {
            const isAllowed = user.userType === UserTypes.ADMIN || (user.userType === UserTypes.BUILDER && user.companyId === companyId) || user.userType == UserTypes.EMPLOYEE;

            if (!isAllowed) throw new ForbiddenException("Action Not Allowed");
            const linkFieldMapping = { 'initial-selection': 'linkToInitalSelection', 'paint-selection': 'linkToPaintSelection', 'questionnaire': 'linkToQuestionnaire', };
            const company = await this.checkCompanyExist(companyId);
            const job = await this.checkJobExist(jobId, companyId);
            const template = await this.checkTemplateExist(templateId, job.customerId, job.id, companyId);
            const linkedTypeCondition = { clientTemplateId: template.id, isDeleted: false };
            const whereClause: any = { [linkFieldMapping[type]]: true, };

            const { _max } = await this.databaseService.clientCategory.aggregate({
                _max: { questionnaireOrder: true, initialOrder: true, paintOrder: true, },
                where: linkedTypeCondition,
            });

            const initialSelectionTypes = { linkToInitalSelection: false, linkToPaintSelection: false, };
            const orderValues = { questionnaireOrder: 0, initialOrder: 0, paintOrder: 0, };
            const orderByClause = {
                'questionnaire': { 'category': 'questionnaireOrder', 'question': 'questionOrder' },
                'initial-selection': { 'category': 'initialOrder', 'question': 'initialQuestionOrder' },
                'paint-selection': { 'category': 'paintOrder', 'question': 'paintQuestionOrder' }
            }
            if (whereClause.linkToQuestionnaire) {
                orderValues.questionnaireOrder = (_max?.questionnaireOrder || 0) + 1;
            }

            if (body.isCategoryLinkedSelection && Array.isArray(body.linkedSelections)) {
                body.linkedSelections.forEach((selection) => {
                    initialSelectionTypes.linkToInitalSelection ||= selection === SelectionTemplates.INITIAL_SELECTION;
                    initialSelectionTypes.linkToPaintSelection ||= selection === SelectionTemplates.PAINT_SELECTION;
                });
            }

            const selectionTypeLinks = {
                [SelectionTemplates.INITIAL_SELECTION.toLowerCase().replace(/ /g, "-")]: "linkToInitalSelection",
                [SelectionTemplates.PAINT_SELECTION.toLowerCase().replace(/ /g, "-")]: "linkToPaintSelection",
            };

            if (type in selectionTypeLinks) {
                initialSelectionTypes[selectionTypeLinks[type]] = true;
            }

            if (initialSelectionTypes.linkToInitalSelection) {
                orderValues.initialOrder = (_max?.initialOrder || 0) + 1;
            }

            if (initialSelectionTypes.linkToPaintSelection) {
                orderValues.paintOrder = (_max?.paintOrder || 0) + 1;
            }

            await this.databaseService.clientCategory.create({
                data: {
                    name: body.name,
                    isCompanyCategory: true,
                    companyId: company.id,
                    clientTemplateId: template.id,
                    linkToPhase: body.isCategoryLinkedPhase,
                    phaseIds: body.phaseIds,
                    linkToQuestionnaire: type === 'questionnaire',
                    customerId: job.customerId,
                    jobId,
                    ...initialSelectionTypes,
                    ...orderValues
                },
            })

            const clientCategories = await this.databaseService.clientCategory.findMany({
                where: { isDeleted: false, clientTemplateId: template.id, customerId: job.customerId, jobId, companyId, ...whereClause },
                include: {
                    ClientTemplateQuestion: {
                        where: { isDeleted: false, clientTemplateId: template.id, jobId, customerId: job.customerId, ...whereClause },
                        omit: { createdAt: true, updatedAt: true, },
                        orderBy: { [orderByClause[type]['question']]: 'asc' },
                        include: {
                            answer: {
                                where: {
                                    companyId, jobId: job.id, customerId: job.customerId, clientTemplateId: template.id
                                }
                            }
                        }
                    }
                },
                orderBy: { [orderByClause[type]['category']]: 'asc' }
            });

            return { category: clientCategories, message: ResponseMessages.CATEGORY_ADDED_SUCCESSFULLY };
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
    async updateCategory(user: User, companyId: number, jobId: number, type: TemplateTypeValue, templateId: number, categoryId: number, body: ClientCategoryDTO) {

        try {
            const isAllowed = user.userType === UserTypes.ADMIN || (user.userType === UserTypes.BUILDER && user.companyId === companyId) || user.userType == UserTypes.EMPLOYEE;

            if (!isAllowed) {
                throw new ForbiddenException("Action Not Allowed");
            }
            const hasSelectionChange = body.isCategoryLinkedSelection && Array.isArray(body.linkedSelections);
            await this.checkCompanyExist(companyId);
            const job = await this.checkJobExist(jobId, companyId);
            const template = await this.checkTemplateExist(templateId, job.customerId, job.id, companyId);
            let clientCategory = await this.checkClientCategory(categoryId, template.id, job.customerId, job.id, companyId);
            const linkFieldMapping = { 'initial-selection': 'linkToInitalSelection', 'paint-selection': 'linkToPaintSelection', 'questionnaire': 'linkToQuestionnaire', };
            const linkedTypeCondition = { clientTemplateId: template.id, isDeleted: false };
            const whereClause = { [linkFieldMapping[type]]: true, };
            const orderByClause = {
                'questionnaire': { 'category': 'questionnaireOrder', 'question': 'questionOrder' },
                'initial-selection': { 'category': 'initialOrder', 'question': 'initialQuestionOrder' },
                'paint-selection': { 'category': 'paintOrder', 'question': 'paintQuestionOrder' }
            }
            const initialSelectionTypes = { linkToInitalSelection: false, linkToPaintSelection: false };
            const orderValues = { initialOrder: 0, paintOrder: 0 };

            const selectionTypeLinks = {
                [SelectionTemplates.INITIAL_SELECTION.toLowerCase().replace(/ /g, "-")]: "linkToInitalSelection",
                [SelectionTemplates.PAINT_SELECTION.toLowerCase().replace(/ /g, "-")]: "linkToPaintSelection",
            };
            const oldCategoryPhaseIds = clientCategory.phaseIds;

            const { _max } = await this.databaseService.clientCategory.aggregate({
                _max: { questionnaireOrder: true, initialOrder: true, paintOrder: true, },
                where: linkedTypeCondition
            });

            if (hasSelectionChange) {
                body.linkedSelections.forEach((selection) => {
                    initialSelectionTypes.linkToInitalSelection ||= selection === SelectionTemplates.INITIAL_SELECTION;
                    initialSelectionTypes.linkToPaintSelection ||= selection === SelectionTemplates.PAINT_SELECTION;
                })
            }
            const initialValue = clientCategory.initialOrder;
            const paintValue = clientCategory.paintOrder;
            let decrement = { initialOrder: false, paintOrder: false }
            if (type in selectionTypeLinks) {
                initialSelectionTypes[selectionTypeLinks[type]] = true;
            }
            if (initialSelectionTypes.linkToInitalSelection && !clientCategory.linkToInitalSelection) {
                orderValues.initialOrder = (_max?.initialOrder || 0) + 1;
            } else {
                orderValues.initialOrder = clientCategory.initialOrder;
            }

            if (initialSelectionTypes.linkToPaintSelection && !clientCategory.linkToPaintSelection) {
                orderValues.paintOrder = (_max?.paintOrder || 0) + 1;
            } else {
                orderValues.paintOrder = clientCategory.paintOrder;
            }

            if (type === 'questionnaire' && clientCategory.linkToInitalSelection && !initialSelectionTypes.linkToInitalSelection) {
                orderValues.initialOrder = 0;
                decrement.initialOrder = true;
            }

            if (type === 'questionnaire' && clientCategory.linkToPaintSelection && !initialSelectionTypes.linkToPaintSelection) {
                orderValues.paintOrder = 0;
                decrement.paintOrder = true;
            }

            const updatedCategory = await this.databaseService.$transaction(async (tx) => {
                await tx.clientCategory.update({
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
                        ...initialSelectionTypes,
                        linkToPhase: body.isCategoryLinkedPhase,
                        phaseIds: body.phaseIds,
                        ...orderValues,
                        jobId,

                    },
                });
                if (decrement.initialOrder) {
                    await tx.clientCategory.updateMany({
                        where: {
                            isDeleted: false,
                            clientTemplateId: template.id,
                            initialOrder: { gt: initialValue }
                        },
                        data: { initialOrder: { decrement: 1 } }
                    })
                }

                if (decrement.paintOrder) {
                    await tx.clientCategory.updateMany({
                        where: {
                            isDeleted: false,
                            clientTemplateId: template.id,
                            paintOrder: { gt: paintValue }
                        },
                        data: { paintOrder: { decrement: 1 } }
                    })
                }

                const category = await tx.clientCategory.findFirstOrThrow({
                    where: {
                        id: clientCategory.id,
                        isDeleted: false,
                        clientTemplateId: template.id,
                        jobId,
                        customerId: job.customerId,
                        companyId,
                        ...whereClause
                    },
                });

                return category;
            });

            const templateQuestions = await this.databaseService.clientTemplateQuestion.findMany({
                where: { isDeleted: false, clientTemplateId: template.id, jobId, customerId: job.customerId, ...whereClause },
                omit: { createdAt: true, updatedAt: true, },
                orderBy: { [orderByClause[type]['question']]: 'asc' },
            });

            for (const templateQuestion of templateQuestions) {
                const questionPhaseIds = templateQuestion.phaseIds ?? [];
                const removedPhases = oldCategoryPhaseIds.filter(id => !body.phaseIds.includes(id));
                const withoutRemoved = questionPhaseIds.filter(id => !removedPhases.includes(id));
                const mergedPhaseIds = [...new Set([...withoutRemoved, ...body.phaseIds])].sort((a, b) => a - b);

                let isLinkedInitialSelection = templateQuestion.linkToInitalSelection;
                let isLinkedPaintSelection = templateQuestion.linkToPaintSelection;

                if (type === 'questionnaire') {
                    isLinkedInitialSelection = updatedCategory.linkToInitalSelection;
                    isLinkedPaintSelection = updatedCategory.linkToPaintSelection;
                }

                await this.databaseService.clientTemplateQuestion.update({
                    where: {
                        id: templateQuestion.id,
                        isDeleted: false,
                    },
                    data: {
                        linkToPhase: body.isCategoryLinkedPhase,
                        phaseIds: mergedPhaseIds,
                        linkToInitalSelection: isLinkedInitialSelection,
                        linkToPaintSelection: isLinkedPaintSelection
                    }
                })
            }

            const clientCategories = await this.databaseService.clientCategory.findMany({
                where: { isDeleted: false, clientTemplateId: template.id, customerId: job.customerId, jobId, companyId, ...whereClause },
                include: {
                    ClientTemplateQuestion: {
                        where: { isDeleted: false, clientTemplateId: template.id, jobId, customerId: job.customerId, ...whereClause },
                        omit: { createdAt: true, updatedAt: true, },
                        orderBy: { [orderByClause[type]['question']]: 'asc' },
                        include: {
                            answer: {
                                where: { companyId, jobId: job.id, customerId: job.customerId, clientTemplateId: template.id }
                            }
                        }
                    }
                },
                orderBy: { [orderByClause[type]['category']]: 'asc' }
            });

            return { category: clientCategories, message: ResponseMessages.CATEGORY_UPDATED };
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

    // delete category: Questionnnaire & Selection
    async deleteCategory(user: User, type: TemplateTypeValue, companyId: number, jobId: number, templateId: number, categoryId: number) {
        try {
            const isAllowed = user.userType === UserTypes.ADMIN || (user.userType === UserTypes.BUILDER && user.companyId === companyId) || user.userType == UserTypes.EMPLOYEE;

            if (!isAllowed) {
                throw new ForbiddenException("Action Not Allowed");
            }
            const linkFieldMapping = { 'initial-selection': 'linkToInitalSelection', 'paint-selection': 'linkToPaintSelection', 'questionnaire': 'linkToQuestionnaire', };
            await this.checkCompanyExist(companyId);
            const job = await this.checkJobExist(jobId, companyId);
            const template = await this.checkTemplateExist(templateId, job.customerId, job.id, companyId);
            let clientCategory = await this.checkClientCategory(categoryId, template.id, job.customerId, job.id, companyId);
            const whereClause = { [linkFieldMapping[type]]: true };
            const { questionnaireOrder, initialOrder, paintOrder } = clientCategory;
            const orderByClause = {
                'questionnaire': { 'category': 'questionnaireOrder', 'question': 'questionOrder' },
                'initial-selection': { 'category': 'initialOrder', 'question': 'initialQuestionOrder' },
                'paint-selection': { 'category': 'paintOrder', 'question': 'paintQuestionOrder' }
            }
            await this.databaseService.$transaction(async (tx) => {
                await tx.clientQuestionAnswer.deleteMany({
                    where: { id: clientCategory.id },
                });
                await tx.clientTemplateQuestion.updateMany({
                    where: {
                        clientTemplateId: template.id,
                        isDeleted: false,
                        clientCategoryId: clientCategory.id,
                        jobId: job.id,
                        customerId: job.customerId
                    },
                    data: { isDeleted: true, questionOrder: 0, initialQuestionOrder: 0, paintQuestionOrder: 0 }
                });

                await tx.clientCategory.update({
                    where: { id: clientCategory.id, },
                    data: { isDeleted: true, questionnaireOrder: 0, initialOrder: 0, paintOrder: 0 }
                })
                if (questionnaireOrder > 0) {
                    await tx.clientCategory.updateMany({
                        where: {
                            clientTemplateId: template.id,
                            isDeleted: false,
                            jobId: job.id,
                            customerId: job.customerId,
                            companyId,
                            questionnaireOrder: { gt: questionnaireOrder }
                        },
                        data: { questionnaireOrder: { decrement: 1 } }
                    })
                }

                if (initialOrder > 0) {
                    await tx.clientCategory.updateMany({
                        where: {
                            clientTemplateId: template.id,
                            isDeleted: false,
                            jobId: job.id,
                            customerId: job.customerId,
                            companyId,
                            initialOrder: { gt: initialOrder }
                        },
                        data: { initialOrder: { decrement: 1 } }
                    })
                }

                if (paintOrder > 0) {
                    await tx.clientCategory.updateMany({
                        where: {
                            clientTemplateId: template.id,
                            isDeleted: false,
                            jobId: job.id,
                            customerId: job.customerId,
                            companyId,
                            paintOrder: { gt: paintOrder }
                        },
                        data: { paintOrder: { decrement: 1 } }
                    })
                }
            });

            const clientCategories = await this.databaseService.clientCategory.findMany({
                where: { isDeleted: false, clientTemplateId: template.id, customerId: job.customerId, jobId, companyId, ...whereClause },
                include: {
                    ClientTemplateQuestion: {
                        where: { isDeleted: false, clientTemplateId: template.id, jobId, customerId: job.customerId, ...whereClause },
                        omit: { createdAt: true, updatedAt: true, },
                        orderBy: { [orderByClause[type]['question']]: 'asc' },
                        include: {
                            answer: {
                                where: {
                                    companyId, jobId: job.id, customerId: job.customerId, clientTemplateId: template.id
                                }
                            }
                        }
                    }
                },
                orderBy: { [orderByClause[type]['category']]: 'asc' }
            });

            return { category: clientCategories, message: ResponseMessages.QUESTION_DELETED }
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


    private async alterCategory(templateId: any, categoryId: number, linkedValue: { linkToInitalSelection: boolean, linkToPaintSelection: boolean }) {
        let { _max: catAggregate } = await this.databaseService.clientCategory.aggregate({
            _max: { questionnaireOrder: true, initialOrder: true, paintOrder: true },
            where: { isDeleted: false, clientTemplateId: templateId }
        });
        const categoryItem = await this.databaseService.clientCategory.findUniqueOrThrow({
            where: { id: categoryId, isDeleted: false, clientTemplateId: templateId }
        })
        let linkedData = {
            linkToInitalSelection: categoryItem.linkToInitalSelection,
            linkToPaintSelection: categoryItem.linkToPaintSelection,
            initialOrder: categoryItem.initialOrder,
            paintOrder: categoryItem.paintOrder
        }

        if (linkedValue.linkToInitalSelection && !categoryItem.linkToInitalSelection) {
            linkedData.initialOrder = catAggregate.initialOrder + 1;
            linkedData.linkToInitalSelection = true
        }

        if (linkedValue.linkToPaintSelection && !categoryItem.linkToPaintSelection) {
            linkedData.paintOrder = catAggregate.paintOrder + 1;
            linkedData.linkToPaintSelection = true
        }
        if (Object.keys(linkedData).length > 0) {
            await this.databaseService.clientCategory.update({
                where: { id: categoryId, isDeleted: false },
                data: linkedData
            })
        }
    }

    // Create Question: Questionnaire & Selection
    async createQuestion(user: User, type: TemplateTypeValue, companyId: number, jobId: number, templateId: number, categoryId: number, body: ClientQuestionDTO) {
        try {
            const isAllowed = user.userType === UserTypes.ADMIN || (user.userType === UserTypes.BUILDER && user.companyId === companyId) || user.userType == UserTypes.EMPLOYEE;

            if (!isAllowed) {
                throw new ForbiddenException("Action Not Allowed");
            }
            await this.checkCompanyExist(companyId);
            const job = await this.checkJobExist(jobId, companyId);
            const template = await this.checkTemplateExist(templateId, job.customerId, job.id, companyId);
            const category = await this.checkClientCategory(categoryId, template.id, job.customerId, job.id, companyId);
            const linkFieldMapping = { 'initial-selection': 'linkToInitalSelection', 'paint-selection': 'linkToPaintSelection', 'questionnaire': 'linkToQuestionnaire', };
            let { _max } = await this.databaseService.clientTemplateQuestion.aggregate({
                _max: { questionOrder: true, initialQuestionOrder: true, paintQuestionOrder: true },
                where: {
                    clientTemplateId: templateId,
                    clientCategoryId: categoryId,
                    customerId: job.customerId,
                    jobId: job.id,
                    isDeleted: false,
                }
            });

            const initialSelectionTypes = { linkToInitalSelection: false, linkToPaintSelection: false };
            const orderValues = { questionOrder: 0, initialQuestionOrder: 0, paintQuestionOrder: 0 };
            const whereClause: any = { [linkFieldMapping[type]]: true };
            const orderByClause = {
                'questionnaire': { 'category': 'questionnaireOrder', 'question': 'questionOrder' },
                'initial-selection': { 'category': 'initialOrder', 'question': 'initialQuestionOrder' },
                'paint-selection': { 'category': 'paintOrder', 'question': 'paintQuestionOrder' }
            }
            if (body.isQuestionLinkedSelections && Array.isArray(body.linkedSelections)) {
                body.linkedSelections.forEach((selection) => {
                    initialSelectionTypes.linkToInitalSelection ||= selection === SelectionTemplates.INITIAL_SELECTION;
                    initialSelectionTypes.linkToPaintSelection ||= selection === SelectionTemplates.PAINT_SELECTION;
                });
            }

            if (type === 'questionnaire') {
                initialSelectionTypes.linkToInitalSelection = category.linkToInitalSelection
                initialSelectionTypes.linkToPaintSelection = category.linkToPaintSelection
            }

            const selectionTypeLinks = {
                [SelectionTemplates.INITIAL_SELECTION.toLowerCase().replace(/ /g, "-")]: "linkToInitalSelection",
                [SelectionTemplates.PAINT_SELECTION.toLowerCase().replace(/ /g, "-")]: "linkToPaintSelection",
            }

            if (type in selectionTypeLinks) {
                initialSelectionTypes[selectionTypeLinks[type]] = true;
            }
            await this.alterCategory(template.id, category.id, initialSelectionTypes)
            if (whereClause.linkToQuestionnaire) {
                orderValues.questionOrder = (_max?.questionOrder || 0) + 1;
            }

            if (initialSelectionTypes.linkToInitalSelection) {
                orderValues.initialQuestionOrder = (_max?.initialQuestionOrder || 0) + 1;
            }

            if (initialSelectionTypes.linkToPaintSelection) {
                orderValues.paintQuestionOrder = (_max?.paintQuestionOrder || 0) + 1;
            }

            const linkToPhase = body.isQuestionLinkedPhase || category.linkToPhase;
            const mergedPhaseIds = Array.from(
                new Set([...(category.phaseIds || []), ...(body.phaseIds || [])])
            ).sort((a, b) => a - b);

            await this.databaseService.clientTemplateQuestion.create({
                data: {
                    question: body.question,
                    questionType: body.type,
                    multipleOptions: body.multipleOptions,
                    linkToPhase: linkToPhase,
                    linkToQuestionnaire: type === 'questionnaire',
                    clientTemplateId: templateId,
                    clientCategoryId: categoryId,
                    phaseIds: mergedPhaseIds,
                    customerId: job.customerId,
                    jobId: job.id,
                    ...orderValues,
                    ...initialSelectionTypes
                }
            })

            const clientCategories = await this.databaseService.clientCategory.findMany({
                where: { isDeleted: false, clientTemplateId: template.id, customerId: job.customerId, jobId, companyId, ...whereClause },
                include: {
                    ClientTemplateQuestion: {
                        where: { isDeleted: false, clientTemplateId: template.id, jobId, customerId: job.customerId, ...whereClause },
                        omit: { createdAt: true, updatedAt: true, },
                        orderBy: { [orderByClause[type]['question']]: 'asc' },
                        include: {
                            answer: {
                                where: {
                                    companyId, jobId: job.id, customerId: job.customerId, clientTemplateId: template.id
                                }
                            }
                        }
                    }
                },
                orderBy: { [orderByClause[type]['category']]: 'asc' }
            });

            return { category: clientCategories, message: ResponseMessages.QUESTION_ADDED }

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
    async editQuestion(user: User, type: TemplateTypeValue, companyId: number, jobId: number, templateId: number, categoryId: number, questionId: number, body: ClientQuestionDTO) {
        try {
            const isAllowed = user.userType === UserTypes.ADMIN || (user.userType === UserTypes.BUILDER && user.companyId === companyId) || user.userType == UserTypes.EMPLOYEE;
            if (!isAllowed) throw new ForbiddenException("Action Not Allowed");

            await this.checkCompanyExist(companyId);
            const job = await this.checkJobExist(jobId, companyId);
            const template = await this.checkTemplateExist(templateId, job.customerId, job.id, companyId);
            let clientCategory = await this.checkClientCategory(categoryId, template.id, job.customerId, job.id, companyId);
            const question = await this.checkQuestion(questionId, clientCategory.id, template.id, job.customerId, job.id, companyId);
            const linkFieldMapping = { 'initial-selection': 'linkToInitalSelection', 'paint-selection': 'linkToPaintSelection', 'questionnaire': 'linkToQuestionnaire', };
            const whereClause = { [linkFieldMapping[type]]: true };
            const initialSelectionTypes = { linkToInitalSelection: false, linkToPaintSelection: false };
            const orderValues = { initialQuestionOrder: 0, paintQuestionOrder: 0 };
            const selectionTypeLinks = {
                [SelectionTemplates.INITIAL_SELECTION.toLowerCase().replace(/ /g, "-")]: "linkToInitalSelection",
                [SelectionTemplates.PAINT_SELECTION.toLowerCase().replace(/ /g, "-")]: "linkToPaintSelection",
            };
            const orderByClause = {
                'questionnaire': { 'category': 'questionnaireOrder', 'question': 'questionOrder' },
                'initial-selection': { 'category': 'initialOrder', 'question': 'initialQuestionOrder' },
                'paint-selection': { 'category': 'paintOrder', 'question': 'paintQuestionOrder' }
            }
            let { _max } = await this.databaseService.clientTemplateQuestion.aggregate({
                _max: { questionOrder: true, initialQuestionOrder: true, paintQuestionOrder: true },
                where: {
                    clientTemplateId: templateId, clientCategoryId: categoryId, customerId: job.customerId, jobId: job.id, isDeleted: false,
                }
            })

            if (body.isQuestionLinkedSelections && Array.isArray(body.linkedSelections)) {
                body.linkedSelections.forEach((selection) => {
                    initialSelectionTypes.linkToInitalSelection ||= selection === SelectionTemplates.INITIAL_SELECTION;
                    initialSelectionTypes.linkToPaintSelection ||= selection === SelectionTemplates.PAINT_SELECTION;
                });
            }
            if (type in selectionTypeLinks) {
                initialSelectionTypes[selectionTypeLinks[type]] = true;
            }

            if (initialSelectionTypes.linkToInitalSelection) {
                if (!question.linkToInitalSelection) {
                    orderValues.initialQuestionOrder = (_max?.initialQuestionOrder || 0) + 1;
                } else {
                    orderValues.initialQuestionOrder = question.initialQuestionOrder
                }
            }
            if (initialSelectionTypes.linkToPaintSelection) {
                if (!question.linkToPaintSelection) {
                    orderValues.paintQuestionOrder = (_max?.paintQuestionOrder || 0) + 1;
                } else {
                    orderValues.paintQuestionOrder = question.paintQuestionOrder
                }
            }
            let initialValue = question.initialQuestionOrder;
            let paintValue = question.paintQuestionOrder;
            const decrement = { initialOrder: false, paintOrder: false, }
            // the question is initially linked by needs to unlink.
            if (type === 'questionnaire' && question.linkToInitalSelection && !initialSelectionTypes.linkToInitalSelection) {
                orderValues.initialQuestionOrder = 0
                decrement.initialOrder = true;
            }
            if (type === 'questionnaire' && question.linkToPaintSelection && !initialSelectionTypes.linkToPaintSelection) {
                orderValues.paintQuestionOrder = 0
                decrement.paintOrder = true;
            }

            await this.databaseService.$transaction(async (tx) => {
                await tx.clientTemplateQuestion.update({
                    where: { id: questionId },
                    data: {
                        question: body.question,
                        questionType: body.type,
                        multipleOptions: body.multipleOptions,
                        linkToPhase: body.isQuestionLinkedPhase,
                        phaseIds: body.phaseIds,
                        ...initialSelectionTypes,
                        ...orderValues
                    }
                })

                if (decrement.initialOrder) {
                    await tx.clientTemplateQuestion.updateMany({
                        where: {
                            clientTemplateId: template.id,
                            clientCategoryId: clientCategory.id,
                            initialQuestionOrder: { gt: initialValue },
                            isDeleted: false,
                        },
                        data: { initialQuestionOrder: { decrement: 1 } }
                    })
                }
                if (decrement.paintOrder) {
                    await tx.clientTemplateQuestion.updateMany({
                        where: {
                            clientTemplateId: template.id,
                            clientCategoryId: clientCategory.id,
                            paintQuestionOrder: { gt: paintValue },
                            isDeleted: false,
                        },
                        data: { paintQuestionOrder: { decrement: 1 } }
                    })
                }
            });

            const clientCategories = await this.databaseService.clientCategory.findMany({
                where: { isDeleted: false, clientTemplateId: template.id, customerId: job.customerId, jobId, companyId, ...whereClause },
                include: {
                    ClientTemplateQuestion: {
                        where: { isDeleted: false, clientTemplateId: template.id, jobId, customerId: job.customerId, ...whereClause },
                        omit: { createdAt: true, updatedAt: true, },
                        orderBy: { [orderByClause[type]['question']]: 'asc' },
                        include: {
                            answer: {
                                where: {
                                    companyId, jobId: job.id, customerId: job.customerId, clientTemplateId: template.id
                                }
                            }
                        }
                    }
                },
                orderBy: { [orderByClause[type]['category']]: 'asc' }
            });

            return { category: clientCategories, message: ResponseMessages.QUESTION_UPDATED }
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

    // Delete Question: Questionnaire & Selection
    async deleteQuestion(user: User, type: TemplateTypeValue, companyId: number, jobId: number, templateId: number, categoryId: number, questionId: number) {
        try {
            const isAllowed = user.userType === UserTypes.ADMIN || (user.userType === UserTypes.BUILDER && user.companyId === companyId) || user.userType == UserTypes.EMPLOYEE;

            if (!isAllowed) throw new ForbiddenException("Action Not Allowed");
            const linkFieldMapping = { 'initial-selection': 'linkToInitalSelection', 'paint-selection': 'linkToPaintSelection', 'questionnaire': 'linkToQuestionnaire', };
            await this.checkCompanyExist(companyId);
            const job = await this.checkJobExist(jobId, companyId);
            const template = await this.checkTemplateExist(templateId, job.customerId, job.id, companyId);
            let clientCategory = await this.checkClientCategory(categoryId, template.id, job.customerId, job.id, companyId);
            let question = await this.checkQuestion(questionId, clientCategory.id, template.id, job.customerId, job.id, companyId);

            const { questionOrder, paintQuestionOrder, initialQuestionOrder } = question;
            const whereClause = { [linkFieldMapping[type]]: true };

            await this.databaseService.$transaction(async (tx) => {
                await tx.clientQuestionAnswer.deleteMany({
                    where: { id: question.id }
                })
                await tx.clientTemplateQuestion.update({
                    where: { id: question.id },
                    data: {
                        isDeleted: true,
                        questionOrder: 0,
                        initialQuestionOrder: 0,
                        paintQuestionOrder: 0
                    }
                });
                if (questionOrder > 0) {
                    await tx.clientTemplateQuestion.updateMany({
                        where: {
                            clientTemplateId: template.id,
                            clientCategoryId: clientCategory.id,
                            isDeleted: false,
                            questionOrder: { gt: questionOrder }
                        },
                        data: { questionOrder: { decrement: 1 } }
                    });
                }

                if (initialQuestionOrder > 0) {
                    await tx.clientTemplateQuestion.updateMany({
                        where: {
                            clientTemplateId: template.id,
                            clientCategoryId: clientCategory.id,
                            isDeleted: false,
                            initialQuestionOrder: { gt: initialQuestionOrder }
                        },
                        data: { initialQuestionOrder: { decrement: 1 } }
                    })
                }
                if (paintQuestionOrder > 0) {
                    await tx.clientTemplateQuestion.updateMany({
                        where: {
                            clientTemplateId: template.id,
                            clientCategoryId: clientCategory.id,
                            isDeleted: false,
                            paintQuestionOrder: { gt: paintQuestionOrder }
                        },
                        data: { paintQuestionOrder: { decrement: 1 } }
                    })
                }
            });

            const orderByClause = {
                'questionnaire': { 'category': 'questionnaireOrder', 'question': 'questionOrder' },
                'initial-selection': { 'category': 'initialOrder', 'question': 'initialQuestionOrder' },
                'paint-selection': { 'category': 'paintOrder', 'question': 'paintQuestionOrder' }
            }

            const clientCategories = await this.databaseService.clientCategory.findMany({
                where: { isDeleted: false, clientTemplateId: template.id, customerId: job.customerId, jobId, companyId, ...whereClause },
                include: {
                    ClientTemplateQuestion: {
                        where: { isDeleted: false, clientTemplateId: template.id, jobId, customerId: job.customerId, ...whereClause },
                        omit: { createdAt: true, updatedAt: true, },
                        orderBy: { [orderByClause[type]['question']]: 'asc' },
                        include: {
                            answer: {
                                where: {
                                    companyId, jobId: job.id, customerId: job.customerId, clientTemplateId: template.id
                                }
                            }
                        }
                    }
                },
                orderBy: { [orderByClause[type]['category']]: 'asc' }
            });

            return { category: clientCategories, message: ResponseMessages.QUESTION_DELETED }

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

    // Update profit calculation type
    async updateProfitCalculationType(user: User, companyId: number, jobId: number, templateId: number, body: { profitCalculationType: ProfitCalculationTypeEnum }) {
        try {
            const isAllowed = user.userType === UserTypes.ADMIN || (user.userType === UserTypes.BUILDER && user.companyId === companyId) || user.userType == UserTypes.EMPLOYEE;
            if (!isAllowed) throw new ForbiddenException("Action Not Allowed");


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
}
