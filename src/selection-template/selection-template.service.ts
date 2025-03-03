import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, QuestionTypes, ResponseMessages, TemplateType, toSnakeCase, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { CreateCategoryDTO } from './validators/create-category';
import { QuestionDTO } from './validators/question';
import { AnswerDTO } from './validators/answer';
import { CategoryOrderDTO } from './validators/order';
import { TemplateNameDTO } from './validators/template';
import { QuestionOrderDTO } from './validators/question-order';
import * as csv from 'csv-parse';
import { ImportTemplateService } from './import-template/import-template.service';
import { SelectionTemplates } from 'src/core/utils/selection-template';

@Injectable()
export class SelectionTemplateService {
    constructor(
        private databaseService: DatabaseService,
        private importTemplateService: ImportTemplateService
    ) { }

    // List all the selection template.
    async getSelectionTemplate(user: User, companyId: number, type: string) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType !== UserTypes.ADMIN && 
                (user.userType !== UserTypes.BUILDER && user.userType !== UserTypes.EMPLOYEE || user.companyId !== companyId)) {
                throw new ForbiddenException("Action Not Allowed");
            }
            // Map type to template type
            const templateTypeMap = {
                'initial-selection': TemplateType.SELECTION_INITIAL,
                'paint-selection': TemplateType.SELECTION_PAINT,
            };

            const templateType = templateTypeMap[type];
            if (!templateType) throw new ForbiddenException("Action Not Allowed");

            let templates = await this.databaseService.questionnaireTemplate.findMany({
                where: {
                    isCompanyTemplate: true,
                    companyId,
                    isDeleted: false,
                },
                omit: {
                    isDeleted: true,
                    isCompanyTemplate: false,
                },
            })
            return { templates }
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

    // List all the category, question and answer of given selection template
    async getSelectionTemplateContent(user: User, companyId: number, type: string, templateId: number) {
        try {
            // Validate User Permissions
            if (user.userType !== UserTypes.ADMIN && 
                (user.userType !== UserTypes.BUILDER && user.userType !== UserTypes.EMPLOYEE || user.companyId !== companyId)) {
                throw new ForbiddenException("Action Not Allowed");
            }

            // Validate Company
            const company = await this.databaseService.company.findUnique({
                where: { id: companyId, isDeleted: false },
            });
            if (!company) {
                throw new ForbiddenException("Company not found.");
            }

            // Map Template Type
            const templateTypeMap = {
                "initial-selection": TemplateType.SELECTION_INITIAL,
                "paint-selection": TemplateType.SELECTION_PAINT,
            };

            const templateType = templateTypeMap[type];
            if (!templateType) {
                throw new ForbiddenException("Invalid template type.");
            }


            // Define Query Filters and Sorting
            const selectionFilters = {
                [TemplateType.SELECTION_INITIAL]: {
                    linkFilter: { linkToInitalSelection: true },
                    categoryOrder: { initialOrder: "asc" },
                    questionOrder: { initialQuestionOrder: "asc" },
                },
                [TemplateType.SELECTION_PAINT]: {
                    linkFilter: { linkToPaintSelection: true },
                    categoryOrder: { paintOrder: "asc" },
                    questionOrder: { paintQuestionOrder: "asc" },
                },
            }[templateType];

            const { linkFilter, categoryOrder, questionOrder } = selectionFilters;

            // Fetch Categories and Questions
            const categories = await this.databaseService.category.findMany({
                where: {
                    questionnaireTemplateId: templateId,
                    isCompanyCategory: true,
                    companyId,
                    isDeleted: false,
                    ...linkFilter,
                },
                include: {
                    questions: {
                        where: { isDeleted: false, ...linkFilter },
                        omit: {
                            isDeleted: true,
                            categoryId: true,
                            questionnaireTemplateId: true,
                        },
                        orderBy: questionOrder,
                    },
                },
                orderBy: categoryOrder,
            });

            return { categories };
        } catch (error) {
            console.error(error);
            // Handle Database Errors
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

    // Create selection template category
    async createSelectionTemplateCategory(user: User, type: string, companyId: number, templateId: number, body: CreateCategoryDTO) {
        try {
            // Validate User Permissions
            if (user.userType !== UserTypes.ADMIN && 
                (user.userType !== UserTypes.BUILDER && user.userType !== UserTypes.EMPLOYEE || user.companyId !== companyId)) {
                throw new ForbiddenException("Action Not Allowed");
            }

            // Check template exist
            const template = await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                where: {
                    id: templateId,
                    isCompanyTemplate: true,
                    companyId,
                    isDeleted: false,
                }
            });

            // Determine order and related properties
            const isInitialSelection = type === SelectionTemplates.INITIAL_SELECTION.toLowerCase().replace(/ /g, "-");
            const isPaintSelection = type === SelectionTemplates.PAINT_SELECTION.toLowerCase().replace(/ /g, "-");

            if (!isInitialSelection && !isPaintSelection) {
                throw new ForbiddenException("Action Not Allowed");
            }

            const aggregateResult = await this.databaseService.category.aggregate({
                _max: isInitialSelection
                    ? { initialOrder: true }
                    : { paintOrder: true },
                where: { questionnaireTemplateId: template.id, isDeleted: false },
            });

            let maxOrder = isInitialSelection
                ? (aggregateResult._max as { initialOrder: number }).initialOrder
                : (aggregateResult._max as { paintOrder: number }).paintOrder;

            const order = (maxOrder || 0) + 1;

            // Prepare data for category creation
            const whereClause = isInitialSelection
                ? { linkToInitalSelection: true, linkToPaintSelection: false, initialOrder: order }
                : { linkToInitalSelection: false, linkToPaintSelection: true, paintOrder: order };

            const categoryData = {
                name: body.name,
                questionnaireOrder: 0,
                isCompanyCategory: true,
                companyId,
                linkToQuestionnaire: false,
                questionnaireTemplateId: templateId,
                linkToPhase: body.isCategoryLinkedPhase,
                phaseIds: body.isCategoryLinkedPhase ? body.phaseIds : [],
                ...whereClause,
            };

            const category = await this.databaseService.category.create({
                data: categoryData,
                omit: { isDeleted: true, isCompanyCategory: false },
            });

            return { category };
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

    // update the selection category template
    async updateSelectionCategory(user: User, type: string, companyId: number, templateId: number, categoryId: number, body: CreateCategoryDTO) {
        try {
            // Validate user permissions
            if (user.userType !== UserTypes.ADMIN && 
                (user.userType !== UserTypes.BUILDER && user.userType !== UserTypes.EMPLOYEE || user.companyId !== companyId)) {
                throw new ForbiddenException("Action Not Allowed");
            }

            // Validate template existence
            const template = await this.databaseService.questionnaireTemplate.findUnique({
                where: {
                    id: templateId,
                    isCompanyTemplate: true,
                    companyId,
                    isDeleted: false,
                }
            });

            if (!template) {
                throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
            }
            // Validate category existence
            let category = await this.databaseService.category.findUnique({
                where: {
                    id: categoryId,
                    questionnaireTemplateId: templateId,
                    isDeleted: false,
                    isCompanyCategory: true,
                    companyId,
                }
            });

            if (!category) {
                throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
            }

            // Update category
            category = await this.databaseService.category.update({
                where: {
                    id: categoryId,
                    questionnaireTemplateId: templateId,
                    isDeleted: false,
                    isCompanyCategory: true,
                    companyId,
                },
                data: {
                    name: body.name,
                    linkToPhase: body.isCategoryLinkedPhase,
                    phaseIds: body.isCategoryLinkedPhase ? body.phaseIds : []
                }
            });

            return { category, message: ResponseMessages.CATEGORY_UPDATED };

        } catch (error) {
            console.error(error);
            // Handle database exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                } else {
                    console.error(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    //delete category
    async deleteCategory(user: User, type: string, companyId: number, templateId: number, categoryId: number) {
        try {
            // Validate user permissions
            if (user.userType !== UserTypes.ADMIN && 
                (user.userType !== UserTypes.BUILDER && user.userType !== UserTypes.EMPLOYEE || user.companyId !== companyId)) {
                throw new ForbiddenException("Action Not Allowed");
            }

            // Map category type
            const templateTypeMap: Record<string, TemplateType> = {
                'initial-selection': TemplateType.SELECTION_INITIAL,
                'paint-selection': TemplateType.SELECTION_PAINT,
            };

            const templateType = templateTypeMap[type];
            if (!templateType) throw new ForbiddenException("Invalid Template Type");

            // Validate template and category
            await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                where: { id: templateId, isCompanyTemplate: true, companyId, isDeleted: false },
            });

            const category = await this.databaseService.category.findUniqueOrThrow({
                where: {
                    id: categoryId,
                    questionnaireTemplateId: templateId,
                    isCompanyCategory: true,
                    companyId,
                    isDeleted: false,
                },
            });

            // Prepare query parameters based on template type
            const typeSpecificFields = {
                [TemplateType.SELECTION_INITIAL]: {
                    orderField: 'initialOrder',
                    linkField: 'linkToInitalSelection',
                    questionOrderField: 'initialQuestionOrder',
                },
                [TemplateType.SELECTION_PAINT]: {
                    orderField: 'paintOrder',
                    linkField: 'linkToPaintSelection',
                    questionOrderField: 'paintQuestionOrder',
                },
            };

            const { orderField, linkField, questionOrderField } = typeSpecificFields[templateType];
            const categoryOrder = category[orderField];
            // Execute deletion within a transaction
            await this.databaseService.$transaction(async (tx) => {
                // Mark category and its questions as deleted
                await tx.category.update({
                    where: { id: categoryId, questionnaireTemplateId: templateId, isDeleted: false },
                    data: { isDeleted: true, [orderField]: 0 },
                });

                await tx.templateQuestion.updateMany({
                    where: { categoryId, questionnaireTemplateId: templateId, isDeleted: false },
                    data: { isDeleted: true },
                });

                // Decrement order of subsequent categories
                await tx.category.updateMany({
                    where: {
                        questionnaireTemplateId: templateId,
                        isDeleted: false,
                        isCompanyCategory: true,
                        [orderField]: { gt: categoryOrder },
                    },
                    data: { [orderField]: { decrement: 1 } },
                });
            });

            // Fetch updated categories
            const updatedCategories = await this.databaseService.category.findMany({
                where: { questionnaireTemplateId: templateId, isDeleted: false, isCompanyCategory: true, [linkField]: true },
                include: {
                    questions: {
                        where: { isDeleted: false, [linkField]: true },
                        orderBy: { [questionOrderField]: 'asc' },
                    },
                },
                orderBy: { [orderField]: 'asc' },
            });

            return { categories: updatedCategories, message: ResponseMessages.CATEGORY_DELETED };
        } catch (error) {
            console.error(error);

            // Handle database errors
            if (error instanceof PrismaClientKnownRequestError && error.code === PrismaErrorCodes.NOT_FOUND) {
                throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
            }

            // Re-throw known exceptions
            if (error instanceof ForbiddenException) throw error;

            // Handle unexpected errors
            throw new InternalServerErrorException();
        }
    }


    // Create question
    async createLabel(user: User, type: string, companyId: number, templateId: number, categoryId: number, body: QuestionDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType !== UserTypes.ADMIN && 
                (user.userType !== UserTypes.BUILDER && user.userType !== UserTypes.EMPLOYEE || user.companyId !== companyId)) {
                throw new ForbiddenException("Action Not Allowed");
            }

            await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                where: { id: templateId, isCompanyTemplate: true, companyId, isDeleted: false }
            });

            await this.databaseService.category.findUniqueOrThrow({
                where: { id: categoryId, isCompanyCategory: true, companyId, isDeleted: false }
            });

            // Map template type
            const templateTypeMapping = {
                'initial-selection': TemplateType.SELECTION_INITIAL,
                'paint-selection': TemplateType.SELECTION_PAINT,
            };
            const templateType = templateTypeMapping[type];
            if (!templateType) {
                throw new ForbiddenException("Action not allowed");
            }

            const isLinkedToInitialSelection = templateType === TemplateType.SELECTION_INITIAL;
            const isLinkedToPaintSelection = templateType === TemplateType.SELECTION_PAINT;

            // Fetch max order and calculate new order
            const orderField = isLinkedToInitialSelection ? 'initialQuestionOrder' : 'paintQuestionOrder';
            const aggregateResult = await this.databaseService.templateQuestion.aggregate({
                _max: { [orderField]: true },
                where: { questionnaireTemplateId: templateId, categoryId, isDeleted: false }
            });

            const maxOrder = aggregateResult._max?.[orderField] || 0;
            const order = body.questionOrder || maxOrder + 1;

            const label = await this.databaseService.templateQuestion.create({
                data: {
                    question: body.question,
                    multipleOptions: body.multipleOptions,
                    questionType: body.type,
                    linkToPhase: body.isQuestionLinkedPhase,
                    linkToInitalSelection: isLinkedToInitialSelection,
                    linkToPaintSelection: isLinkedToPaintSelection,
                    linkToQuestionnaire: false,
                    questionnaireTemplateId: templateId,
                    categoryId,
                    phaseId: body.linkedPhase || null,
                    questionOrder: 0,
                    [orderField]: order,
                    phaseIds: body.phaseIds || null
                }
            });

            const questionsWhereClause: any = { isDeleted: false }
            if (templateType === TemplateType.SELECTION_INITIAL) {
                questionsWhereClause.linkToInitalSelection = true;
            }

            if (templateType === TemplateType.SELECTION_PAINT) {
                questionsWhereClause.linkToPaintSelection = true;
            }

            const orderByClause = { [orderField]: 'asc' };
            const category = await this.databaseService.category.findUniqueOrThrow({
                where: { id: categoryId, isCompanyCategory: true, isDeleted: false },
                include: {
                    questions: {
                        where: questionsWhereClause,
                        orderBy: orderByClause
                    }
                }
            });

            return { questionId: label.id, category, message: ResponseMessages.LABEL_CREATED }
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

    // Update the label
    async updateLabel(user: User, type: string, companyId: number, templateId: number, categoryId: number, labelId: number, body: QuestionDTO) {
        try {
            if (user.userType !== UserTypes.ADMIN && 
                (user.userType !== UserTypes.BUILDER && user.userType !== UserTypes.EMPLOYEE || user.companyId !== companyId)) {
                throw new ForbiddenException("Action Not Allowed");
            }

            if (type !== 'initial-selection' && type !== 'paint-selection') {
                throw new ForbiddenException("Action Not Allowed");
            }
            // Check if the label exists and belongs to the given template and category
            await this.databaseService.templateQuestion.findUniqueOrThrow({
                where: {
                    id: labelId,
                    isDeleted: false,
                    questionnaireTemplateId: templateId,
                    categoryId,
                },
            });

            // Update the label
            await this.databaseService.templateQuestion.update({
                where: {
                    id: labelId,
                    isDeleted: false,
                    questionnaireTemplateId: templateId,
                    categoryId,
                },
                data: {
                    question: body.question,
                    linkToPhase: body.isQuestionLinkedPhase,
                    phaseId: body.isQuestionLinkedPhase ? body.linkedPhase : null,
                    phaseIds: body.phaseIds,
                    questionType: body.type,
                    multipleOptions: body.multipleOptions,
                },
            });

            // Determine template type and build query conditions
            const templateTypeMap = {
                'initial-selection': { type: TemplateType.SELECTION_INITIAL, condition: 'linkToInitalSelection', order: 'initialQuestionOrder' },
                'paint-selection': { type: TemplateType.SELECTION_PAINT, condition: 'linkToPaintSelection', order: 'paintQuestionOrder' },
            };

            const { condition, order } = templateTypeMap[type];
            const quesWhere = { isDeleted: false, ...(condition && { [condition]: true }) };
            const orderBy = { [order]: 'asc' };

            // Fetch category with filtered questions
            const category = await this.databaseService.category.findUniqueOrThrow({
                where: {
                    id: categoryId,
                    questionnaireTemplateId: templateId,
                    isCompanyCategory: true,
                    isDeleted: false,
                    companyId,
                },
                include: {
                    questions: {
                        where: quesWhere,
                        orderBy,
                    },
                },
            });

            return { category, message: ResponseMessages.LABEL_UPDATED };
        } catch (error) {
            console.error(error);

            // Handle specific database errors
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                }
            }

            // Rethrow known exceptions
            if (error instanceof ForbiddenException) {
                throw error;
            }

            // Handle unexpected errors
            throw new InternalServerErrorException();
        }
    }


    async deleteLabel(user: User, type: string, companyId: number, templateId: number, categoryId: number, labelId: number) {
        try {
            // Validate user permissions
            if (user.userType !== UserTypes.ADMIN && 
                (user.userType !== UserTypes.BUILDER && user.userType !== UserTypes.EMPLOYEE || user.companyId !== companyId)) {
                throw new ForbiddenException("Action Not Allowed");
            }

            if (type !== 'initial-selection' && type !== 'paint-selection') {
                throw new ForbiddenException("Action Not Allowed");
            }

            // Fetch question and ensure it exists
            const question = await this.databaseService.templateQuestion.findUnique({
                where: { id: labelId, categoryId: categoryId, isDeleted: false, questionnaireTemplateId: templateId, }
            })

            if (!question) {
                throw new BadRequestException("Question not found.");
            }

            // Determine template type and corresponding fields
            const templateMapping = {
                'initial-selection': { type: TemplateType.SELECTION_INITIAL, field: 'initialQuestionOrder' },
                'paint-selection': { type: TemplateType.SELECTION_PAINT, field: 'paintQuestionOrder' },
            };

            const { type: templateType, field: questionOrderField } = templateMapping[type];
            if (!templateType) throw new BadRequestException("Action Not Allowed");

            // Prepare query filters and ordering
            const whereClause: Record<string, any> = { isDeleted: false };
            const orderBy = { [questionOrderField]: 'asc' };
            if (templateType === TemplateType.SELECTION_INITIAL) whereClause.linkToInitalSelection = true;
            if (templateType === TemplateType.SELECTION_PAINT) whereClause.linkToPaintSelection = true;

            const questionOrder = question[questionOrderField];

            // Perform deletion in a transaction
            await this.databaseService.$transaction(async (tx) => {
                // Mark the question as deleted
                await tx.templateQuestion.update({
                    where: { id: labelId, categoryId, questionnaireTemplateId: templateId, ...whereClause },
                    data: { isDeleted: true, [questionOrderField]: 0 },
                });

                // Remove associated answers
                await tx.templateQuestionAnswer.deleteMany({ where: { questionId: question.id } });


                // Adjust the order of remaining questions
                await tx.templateQuestion.updateMany({
                    where: {
                        questionnaireTemplateId: templateId,
                        categoryId,
                        isDeleted: false,
                        ...whereClause,
                        [questionOrderField]: { gt: questionOrder },
                    },
                    data: { [questionOrderField]: { decrement: 1 } },
                });
            });

            // Fetch the updated category with its questions
            const category = await this.databaseService.category.findUniqueOrThrow({
                where: { id: categoryId, questionnaireTemplateId: templateId, companyId, isCompanyCategory: true, isDeleted: false },
                include: { questions: { where: { isDeleted: false, ...whereClause }, orderBy } },
            });

            return { category, message: ResponseMessages.LABEL_DELETED };

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

    async changeCategoryOrder(user: User, companyId: number, type: string, templateId: number, body: CategoryOrderDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType !== UserTypes.ADMIN && 
                (user.userType !== UserTypes.BUILDER && user.userType !== UserTypes.EMPLOYEE || user.companyId !== companyId)) {
                throw new ForbiddenException("Action Not Allowed");
            }
            let company = await this.databaseService.company.findUnique({
                where: { id: companyId, isDeleted: false },
            });
            if (!company) throw new ForbiddenException("Action Not Allowed");

            let template = await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                where: { id: templateId, isCompanyTemplate: true, isDeleted: false },
            });
            let category = await this.databaseService.category.findUniqueOrThrow({
                where: { id: body.categoryId, questionnaireTemplateId: templateId, isCompanyCategory: true, isDeleted: false, },
            });

            // Determine template type
            const templateType = {
                'initial-selection': TemplateType.SELECTION_INITIAL,
                'paint-selection': TemplateType.SELECTION_PAINT,
            }[type];

            if (!templateType) throw new BadRequestException('Action Not Allowed');

            // Define category and question query clauses
            const categoryWhereClause = {
                isDeleted: false,
                isCompanyCategory: true,
                questionnaireTemplateId: templateId,
                [templateType === TemplateType.SELECTION_INITIAL ? 'linkToInitalSelection' : 'linkToPaintSelection']: true,
            };

            const questionWhereClause = {
                questionnaireTemplateId: templateId,
                isDeleted: false,
                [templateType === TemplateType.SELECTION_INITIAL ? 'linkToInitalSelection' : 'linkToPaintSelection']: true
            };

            const orderBy = {
                [templateType === TemplateType.SELECTION_INITIAL ? 'initialOrder' : 'paintOrder']: 'asc',
            };
            const currentOrder = templateType === TemplateType.SELECTION_INITIAL
                ? category.initialOrder
                : category.paintOrder;

            if (currentOrder !== body.questionnaireOrder) {
                const isIncreasingOrder = currentOrder > body.questionnaireOrder;
                const updateData = isIncreasingOrder ? { increment: 1 } : { decrement: 1 };
                const rangeCondition = isIncreasingOrder
                    ? { gte: body.questionnaireOrder, lt: currentOrder }
                    : { gte: currentOrder, lte: body.questionnaireOrder };

                await this.databaseService.$transaction(async (tx) => {
                    // Update the affected categories
                    await tx.category.updateMany({
                        where: { ...categoryWhereClause, [templateType === TemplateType.SELECTION_INITIAL ? 'initialOrder' : 'paintOrder']: rangeCondition },
                        data: { [templateType === TemplateType.SELECTION_INITIAL ? 'initialOrder' : 'paintOrder']: updateData }
                    });

                    // Update the category with the new order
                    await tx.category.update({
                        where: { id: body.categoryId, ...categoryWhereClause },
                        data: { [templateType === TemplateType.SELECTION_INITIAL ? 'initialOrder' : 'paintOrder']: body.questionnaireOrder },
                    });
                });
            }

            // Retrieve the updated template with categories and questions
            const data = await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                where: { id: templateId, isDeleted: false, isCompanyTemplate: true },
                omit: { companyId: true, isDeleted: true, isCompanyTemplate: false },
                include: {
                    categories: {
                        where: categoryWhereClause,
                        omit: { isDeleted: true, isCompanyCategory: false, companyId: true },
                        include: {
                            questions: {
                                where: questionWhereClause,
                                orderBy: { [templateType === TemplateType.SELECTION_INITIAL ? 'initialQuestionOrder' : 'paintQuestionOrder']: 'asc' },
                            },
                        },
                        orderBy: orderBy,
                    },
                },
            });

            return { template: data, message: ResponseMessages.CATEGORY_ORDER_UPDATED, }
        } catch (error) {
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(
                        ResponseMessages.QUESTIONNAIRE_TEMPLATE_NOT_FOUND
                    );
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    // update the template name
    async updateTemplateName(user: User, type: string, companyId: number, templateId: number, body: TemplateNameDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                // Determine template type
                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                if (!templateType) {
                    throw new ForbiddenException('Action Not Allowed.');
                }

                await this.databaseService.company.findUniqueOrThrow({
                    where: { id: companyId, isDeleted: false }
                })

                let template = await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                    where: { id: templateId, isDeleted: false, isCompanyTemplate: true, companyId },
                });

                await this.databaseService.$transaction(async (tx) => {
                    if (template.projectEstimatorTemplateId) {
                        await tx.projectEstimatorTemplate.update({
                            where: { id: template.projectEstimatorTemplateId },
                            data: { templateName: body.name }
                        });
                    }

                    await tx.questionnaireTemplate.update({
                        where: { id: templateId, isDeleted: false, isCompanyTemplate: true, companyId },
                        data: { name: body.name }
                    });
                });

                let templates = await this.databaseService.questionnaireTemplate.findMany({
                    where: { isCompanyTemplate: true, companyId, isDeleted: false },
                    select: { id: true, name: true }
                })
                return { templates, updatedTemplate: template }

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(
                        ResponseMessages.QUESTIONNAIRE_TEMPLATE_NOT_FOUND
                    );
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    // change question order
    async changeQuestionOrder(user: User, companyId: number, type: string, templateId: number, questionId: number, categoryId: number, body: QuestionOrderDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType !== UserTypes.ADMIN && 
                (user.userType !== UserTypes.BUILDER && user.userType !== UserTypes.EMPLOYEE || user.companyId !== companyId)) {
                throw new ForbiddenException("Action Not Allowed");
            }

            if (type !== 'initial-selection' && type !== 'paint-selection') {
                throw new ForbiddenException("Action Not Allowed");
            }

            // Fetch company and template details
            const company = await this.databaseService.company.findUnique({
                where: { id: companyId, isDeleted: false },
            });
            if (!company) throw new ForbiddenException("Action Not Allowed");

            // Determine template type
            const templateType = {
                'initial-selection': TemplateType.SELECTION_INITIAL,
                'paint-selection': TemplateType.SELECTION_PAINT,
            }[type];

            if (!templateType) {
                throw new ForbiddenException("Action Not Allowed");
            }

            // Prepare query conditions
            const isInitial = templateType === TemplateType.SELECTION_INITIAL;
            const questionOrderField = isInitial ? "initialQuestionOrder" : "paintQuestionOrder";
            const categoryOrderField = isInitial ? "initialOrder" : "paintOrder";
            const categoryField = isInitial ? "linkToInitalSelection" : "linkToPaintSelection";

            const categoryWhereClause = {
                questionnaireTemplateId: templateId,
                isCompanyCategory: true,
                isDeleted: false,
                [categoryField]: true,
            };

            const questionWhereClause = {
                isDeleted: false,
                categoryId: categoryId,
                questionnaireTemplateId: templateId,
                [categoryField]: true,
            };

            // Fetch necessary entities
            await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                where: { id: templateId, isDeleted: false, isCompanyTemplate: true, companyId },
            });

            let category = await this.databaseService.category.findUniqueOrThrow({
                where: { id: categoryId, ...categoryWhereClause },
            });

            const question = await this.databaseService.templateQuestion.findUniqueOrThrow({
                where: { id: questionId, ...questionWhereClause },
            });

            const currentOrder = question[questionOrderField];

            // If no change in order, exit early
            if (currentOrder != body.questionOrder) {
                const isMovingUp = currentOrder > body.questionOrder;
                const rangeCondition = isMovingUp
                    ? { gte: body.questionOrder, lt: currentOrder }
                    : { gt: currentOrder, lte: body.questionOrder };

                const orderAdjustment = isMovingUp ? { increment: 1 } : { decrement: 1 };
                await this.databaseService.$transaction(async (tx) => {
                    await tx.templateQuestion.updateMany({
                        where: {
                            ...questionWhereClause,
                            [questionOrderField]: rangeCondition,
                        },
                        data: { [questionOrderField]: orderAdjustment },
                    });

                    await tx.templateQuestion.update({
                        where: { id: questionId, ...questionWhereClause },
                        data: { [questionOrderField]: body.questionOrder },
                    });
                });
            }

            let { categoryId: updatedCategoryId, ...rest } = questionWhereClause;
            let result = await this.databaseService.category.findMany({
                where: categoryWhereClause,
                include: {
                    questions: {
                        where: rest,
                        orderBy: { [questionOrderField]: "asc" }
                    }
                },
                orderBy: { [categoryOrderField]: "asc" }
            })

            return { categories: result, message: ResponseMessages.QUESTION_ORDER_UPDATED };
        } catch (error) {
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(
                        ResponseMessages.QUESTIONNAIRE_TEMPLATE_NOT_FOUND
                    );
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    async createTemplateName(user: User, companyId: number, type: string, body: TemplateNameDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const company = await this.databaseService.company.findUniqueOrThrow({
                    where: { id: companyId, isDeleted: false, }
                })

                const createResponse = await this.databaseService.$transaction(async (tx) => {
                    const projectEstimator = await tx.projectEstimatorTemplate.create({
                        data: { templateName: body.name, companyId, }
                    });

                    const questionnaire = await tx.questionnaireTemplate.create({
                        data: {
                            name: body.name,
                            templateType: TemplateType.SELECTION_INITIAL,
                            isCompanyTemplate: true,
                            companyId,
                            projectEstimatorTemplateId: projectEstimator.id
                        },
                        omit: {
                            isDeleted: false,
                        }
                    })

                    return { projectEstimator, questionnaire }
                });
                return { template: createResponse.questionnaire, message: ResponseMessages.QUESTIONNAIRE_TEMPLATE_ADDED }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(
                        ResponseMessages.RESOURCE_NOT_FOUND
                    );
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    // delete the template.
    async deleteTemplate(user: User, companyId: number, templateId: number, type: string) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                if (!templateType) {
                    throw new ForbiddenException("Action Not Allowed.");
                }

                const tempToDelete = await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                    where: { id: templateId, isDeleted: false, isCompanyTemplate: true, companyId }
                });

                await this.databaseService.$transaction(async (tx) => {
                    // if project estimator template exist , delete template, headers and data
                    if (tempToDelete.projectEstimatorTemplateId) {
                        const deleteHeaders = await tx.projectEstimatorTemplateHeader.findMany({
                            where: { petId: tempToDelete.projectEstimatorTemplateId, },
                            select: { id: true, }
                        })

                        const deleteHeaderIds = deleteHeaders.map(header => header.id);

                        if (deleteHeaderIds.length > 0) {
                            const deleteData = await tx.projectEstimatorTemplateData.updateMany({
                                where: { petHeaderId: { in: deleteHeaderIds }, isDeleted: false },
                                data: { isDeleted: true, order: 0 }
                            })

                            const deletedHeaders = await tx.projectEstimatorTemplateHeader.updateMany({
                                where: {
                                    id: { in: deleteHeaderIds },
                                    petId: tempToDelete.projectEstimatorTemplateId,
                                    isDeleted: false,
                                    companyId,
                                },
                                data: { isDeleted: true, headerOrder: 0 }
                            })
                        }
                        await tx.projectEstimatorTemplate.update({
                            where: { id: tempToDelete.projectEstimatorTemplateId, },
                            data: { isDeleted: true }
                        })
                    }
                    // if project estimator template exist , delete template, headers and data ends.

                    await tx.questionnaireTemplate.update({
                        where: { id: templateId, },
                        data: { isDeleted: true, }
                    })
                    await tx.category.updateMany({
                        where: { questionnaireTemplateId: templateId, isDeleted: false, },
                        data: { isDeleted: true, questionnaireOrder: 0, initialOrder: 0, paintOrder: 0 }
                    })
                    await tx.templateQuestion.updateMany({
                        where: { questionnaireTemplateId: templateId, isDeleted: false, },
                        data: { isDeleted: true, questionOrder: 0, initialQuestionOrder: 0, paintQuestionOrder: 0 }
                    })
                })

                let whereClause: any = { isDeleted: false }
                let orderByCategory: any = {}
                let orderByQuestion: any = {}
                if (templateType === TemplateType.SELECTION_INITIAL) {
                    whereClause.linkToInitalSelection = true;
                    orderByCategory.initialOrder = 'asc'
                    orderByQuestion.initialQuestionOrder = 'asc'
                }
                if (templateType === TemplateType.SELECTION_PAINT) {
                    whereClause.linkToPaintSelection = true
                    orderByCategory.paintOrder = 'asc'
                    orderByQuestion.paintQuestionOrder = 'asc'
                }

                let template = await this.databaseService.questionnaireTemplate.findMany({
                    where: {
                        companyId,
                        isCompanyTemplate: true,
                        isDeleted: false,
                    },
                    include: {
                        categories: {
                            where: {
                                isCompanyCategory: true,
                                ...whereClause
                            },
                            include: {
                                questions: {
                                    where: whereClause,
                                    orderBy: orderByQuestion
                                }
                            },
                            orderBy: orderByCategory
                        }
                    }
                })

                return { template, message: ResponseMessages.SUCCESSFUL }

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(
                        ResponseMessages.RESOURCE_NOT_FOUND
                    );
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }


    // import template
    async importTemplate(user: User, companyId: number, file: Express.Multer.File, body: { templateId: string }, type: string) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                if (!templateType) {
                    throw new ForbiddenException("Action Not Allowed.");
                }

                let company = await this.databaseService.company.findUniqueOrThrow({
                    where: {
                        id: companyId,
                        isDeleted: false,
                    }
                });

                if (!company) throw new ForbiddenException('Action Not Allowed');

                const csvContent = file.buffer
                const parsedData: any = await new Promise((resolve, reject) => {
                    csv.parse(csvContent, { columns: true, relax_quotes: true, skip_empty_lines: true, cast: true }, (err, records) => {
                        if (err) {
                            reject(err);
                            return { error: true, message: "Unable to parse file" }
                        }
                        const snakeCaseRecords = records.map(record => {
                            const newRecord = {};
                            Object.keys(record).forEach(key => {
                                newRecord[toSnakeCase(key)] = record[key];
                            })
                            return newRecord;
                        })

                        resolve(snakeCaseRecords);
                    });
                });

                if (!parsedData.length) throw new ForbiddenException('Could not read csv file. please check the format and retry.')
                let groupedData = await this.importTemplateService.groupContent(parsedData);
                if (!groupedData || !groupedData.length) throw new ForbiddenException('Could not read csv file. please check the format and retry.')

                const selectionType = templateType === TemplateType.SELECTION_INITIAL ? TemplateType.SELECTION_INITIAL : TemplateType.SELECTION_PAINT

                // create template.
                let template = await this.importTemplateService.checkTemplateExist('selection', body, companyId, selectionType);

                let whereClause: any = {}
                if (templateType === TemplateType.SELECTION_INITIAL) { whereClause.linkToInitalSelection = true; }
                if (templateType === TemplateType.SELECTION_PAINT) { whereClause.linkToPaintSelection = true }

                const templateId = template.id;

                groupedData.forEach(async (element: any) => {
                    await this.importTemplateService.processImport(element, templateId, companyId, selectionType);
                });

                let newTemplate = await this.databaseService.questionnaireTemplate.findMany({
                    where: {
                        companyId,
                        isDeleted: false,
                        isCompanyTemplate: true,
                    },
                    include: {
                        categories: {
                            where: {
                                isDeleted: false,
                                isCompanyCategory: true,
                                ...whereClause
                            },
                            omit: {
                                isDeleted: true,
                                isCompanyCategory: false,
                            },
                            include: {
                                questions: {
                                    where: {
                                        isDeleted: false,
                                        ...whereClause
                                    },
                                    orderBy: {
                                        questionOrder: 'asc'
                                    }
                                }
                            },
                            orderBy: {
                                questionnaireOrder: 'asc'
                            }
                        }
                    }
                });

                return { template: newTemplate, message: ResponseMessages.TEMPLATE_IMPORTED_SUCCESSFULLY }
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
}