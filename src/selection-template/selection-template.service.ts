import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, QuestionTypes, ResponseMessages, TemplateType, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { CreateCategoryDTO } from './validators/create-category';
import { QuestionDTO } from './validators/question';
import { AnswerDTO } from './validators/answer';
import { CategoryOrderDTO } from './validators/order';
import { TemplateNameDTO } from './validators/template';
import { QuestionOrderDTO } from './validators/question-order';

@Injectable()
export class SelectionTemplateService {
    constructor(private databaseService: DatabaseService) { }

    // List all the selection template.
    async getSelectionTemplate(user: User, companyId: number, type: string) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Determine template type
                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                if (!templateType) {
                    throw new ForbiddenException("Action Not Allowed.");
                }

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

    // List all the category, question and answer of given selection template
    async getSelectionTemplateContent(user: User, companyId: number, type: string, templateId: number) {
        try {

            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false,
                    },
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Determine template type
                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                if (!templateType) {
                    throw new ForbiddenException("Action Not Allowed.");
                }

                let whereClause: any = {
                    questionnaireTemplateId: templateId,
                    isCompanyCategory: true,
                    companyId,
                    isDeleted: false,
                };

                let quesWhereClause: any = {
                    isDeleted: false,
                }
                if (templateType === TemplateType.SELECTION_INITIAL) {
                    whereClause.linkToInitalSelection = true;
                    quesWhereClause.linkToInitalSelection = true;
                }
                if (templateType === TemplateType.SELECTION_PAINT) {
                    whereClause.linkToPaintSelection = true
                    quesWhereClause.linkToPaintSelection = true
                }

                let categories = await this.databaseService.category.findMany({
                    where: whereClause,
                    include: {
                        questions: {
                            where: quesWhereClause,
                            include: {
                                answers: true,
                            },
                            omit: {
                                isDeleted: true,
                                categoryId: true,
                                questionnaireTemplateId: true,
                            },
                            orderBy: {
                                questionOrder: 'asc'
                            }
                        },
                    },
                    orderBy: {
                        questionnaireOrder: 'asc'
                    }
                })

                return { categories }
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

    // Create selection template category
    async createSelectionTemplateCategory(user: User, type: string, companyId: number, templateId: number, body: CreateCategoryDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Check template exist
                let template = await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isCompanyTemplate: true,
                        companyId,
                        isDeleted: false,
                    }
                });

                let maxOrder = await this.databaseService.category.aggregate({
                    _max: {
                        questionnaireOrder: true,
                    },
                    where: {
                        questionnaireTemplateId: template.id,
                        isDeleted: false,
                    }
                })

                //increase order by 1.
                const { _max: { questionnaireOrder } } = maxOrder
                let order = questionnaireOrder === null || questionnaireOrder == undefined ? 1 : questionnaireOrder + 1

                // Determine template type
                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                let category = await this.databaseService.category.create({
                    data: {
                        name: body.name,
                        isCompanyCategory: true,
                        questionnaireOrder: order,
                        companyId: companyId,
                        linkToPhase: body.isCategoryLinkedPhase,
                        linkToQuestionnaire: false,
                        linkToInitalSelection: templateType === TemplateType.SELECTION_INITIAL ? true : false,
                        linkToPaintSelection: templateType === TemplateType.SELECTION_PAINT ? true : false,
                        questionnaireTemplateId: templateId,
                        phaseId: body.linkedPhase || null
                    },
                    omit: {
                        isDeleted: true,
                        isCompanyCategory: false,
                    },
                });

                return { category };

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

    // update the selection category template
    async updateSelectionCategory(user: User, type: string, companyId: number, templateId: number, categoryId: number, body: CreateCategoryDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Check template exist
                await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isCompanyTemplate: true,
                        companyId,
                        isDeleted: false,
                    }
                });

                // Determine template type
                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                let category = await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        questionnaireTemplateId: templateId,
                        isDeleted: false,
                        isCompanyCategory: true,
                        companyId,
                    }
                })

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
                        phaseId: body.isCategoryLinkedPhase ? body.linkedPhase : null
                    }
                })

                return { category, message: ResponseMessages.CATEGORY_UPDATED };

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

    //delete category
    async deleteCategory(user: User, type: string, companyId: number, templateId: number, categoryId: number) {
        try {

            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                if (!templateType) {
                    throw new ForbiddenException("Action Not Allowed.");
                }

                await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isCompanyTemplate: true,
                        companyId,
                        isDeleted: false,
                    }
                });

                let categoryToDelete = await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        questionnaireTemplateId: templateId,
                        isCompanyCategory: true,
                        companyId,
                        isDeleted: false
                    }
                })

                const deletedCategoryOrder = categoryToDelete.questionnaireOrder;
                // Mark the category as deleted and set its questionnaireOrder to 0
                await this.databaseService.$transaction([
                    this.databaseService.category.update({
                        where: {
                            id: categoryToDelete.id,
                            questionnaireTemplateId: templateId,
                            isCompanyCategory: true,
                            isDeleted: false,
                        },
                        data: {
                            isDeleted: true,
                            questionnaireOrder: 0, // Set the order to 0 for the deleted category
                        }
                    }),
                    this.databaseService.templateQuestion.updateMany({
                        where: {
                            questionnaireTemplateId: templateId,
                            categoryId: categoryToDelete.id,
                            isDeleted: false,
                        },
                        data: {
                            isDeleted: true,
                        },
                    }),
                    // Decrement the questionnaireOrder of categories with higher orders
                    this.databaseService.category.updateMany({
                        where: {
                            questionnaireTemplateId: templateId,
                            isCompanyCategory: true,
                            isDeleted: false,
                            questionnaireOrder: {
                                gt: deletedCategoryOrder
                            }
                        },
                        data: {
                            questionnaireOrder: {
                                decrement: 1,
                            }
                        }
                    }),
                ]);

                let deleteWhereClause: any = {
                    questionnaireTemplateId: templateId,
                    isCompanyCategory: true,
                    isDeleted: false,
                }

                let quesWhereClause: any = {
                    isDeleted: false,
                }

                if (templateType === TemplateType.SELECTION_INITIAL) {
                    deleteWhereClause.linkToInitalSelection = true;
                    quesWhereClause.linkToInitalSelection = true
                }

                if (templateType === TemplateType.SELECTION_PAINT) {
                    deleteWhereClause.linkToPaintSelection = true
                    quesWhereClause.linkToPaintSelection = true
                }


                // Fetch the updated list of categories
                let categories = await this.databaseService.category.findMany({
                    where: deleteWhereClause,
                    include: {
                        questions: {
                            where: quesWhereClause,
                            include: {
                                answers: true,
                            },
                            omit: {
                                isDeleted: true,
                                categoryId: true,
                                questionnaireTemplateId: true,
                            },
                            orderBy: {
                                questionOrder: 'asc'
                            }
                        }
                    },
                    orderBy: {
                        questionnaireOrder: 'asc'
                    }
                });

                return { categories, message: ResponseMessages.CATEGORY_DELETED };

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

    // Create question
    async createLabel(user: User, type: string, companyId: number, templateId: number, categoryId: number, body: QuestionDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isCompanyTemplate: true,
                        companyId,
                        isDeleted: false,
                    }
                });

                await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        isCompanyCategory: true,
                        companyId,
                        isDeleted: false,
                    }
                });

                // Determine template type
                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                let isLinkedToInitialSelection = templateType === TemplateType.SELECTION_INITIAL ? true : false;
                let isLinkedToPaintSelection = templateType === TemplateType.SELECTION_PAINT ? true : false;

                let maxOrder = await this.databaseService.templateQuestion.aggregate({
                    _max: {
                        questionOrder: true,
                    },
                    where: {
                        questionnaireTemplateId: templateId,
                        categoryId,
                        isDeleted: false,
                    }
                })

                let order = body.questionOrder === 0 ?
                    (maxOrder._max.questionOrder ?? 0) + 1 :
                    body.questionOrder

                let label = await this.databaseService.templateQuestion.create({
                    data: {
                        question: body.question,
                        questionType: body.type,
                        multipleOptions: body.multipleOptions,
                        linkToPhase: body.isQuestionLinkedPhase,
                        linkToQuestionnaire: false,
                        linkToInitalSelection: isLinkedToInitialSelection,
                        linkToPaintSelection: isLinkedToPaintSelection,
                        questionnaireTemplateId: templateId,
                        categoryId: categoryId,
                        phaseId: body.linkedPhase || null,
                        questionOrder: order,
                        contractorIds: body.contractorIds || null
                    },
                    omit: {
                        isDeleted: true,
                    }
                })

                let quesWhere: any = {
                    isDeleted: false,
                }
                if (templateType === TemplateType.SELECTION_INITIAL) {
                    quesWhere.linkToInitalSelection = true;
                }

                if (templateType === TemplateType.SELECTION_PAINT) {
                    quesWhere.linkToPaintSelection = true;
                }

                const category = await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        isCompanyCategory: true,
                        isDeleted: false
                    },
                    include: {
                        questions: {
                            where: quesWhere,
                            orderBy: {
                                questionOrder: 'asc'
                            }
                        }
                    }
                })

                return {
                    questionId: label.id,
                    category,
                    message: ResponseMessages.LABEL_CREATED
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

    // Update the label
    async updateLabel(user: User, type: string, companyId: number, templateId: number, categoryId: number, labelId: number, body: QuestionDTO) {

        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                await this.databaseService.templateQuestion.findUniqueOrThrow({
                    where: {
                        id: labelId,
                        isDeleted: false,
                        questionnaireTemplateId: templateId,
                        categoryId
                    }
                })

                let q = await this.databaseService.templateQuestion.update({
                    where: {
                        id: labelId,
                        isDeleted: false,
                        questionnaireTemplateId: templateId,
                        categoryId
                    },
                    data: {
                        question: body.question,
                        linkToPhase: body.isQuestionLinkedPhase,
                        phaseId: body.isQuestionLinkedPhase ? body.linkedPhase : null,
                        contractorIds: body.contractorIds
                    },
                    omit: {
                        isDeleted: true,
                    }
                });

                // Determine template type
                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                let quesWhere: any = {
                    isDeleted: false,
                }
                if (templateType === TemplateType.SELECTION_INITIAL) {
                    quesWhere.linkToInitalSelection = true;
                }

                if (templateType === TemplateType.SELECTION_PAINT) {
                    quesWhere.linkToPaintSelection = true;
                }

                const category = await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        questionnaireTemplateId: templateId,
                        isCompanyCategory: true,
                        isDeleted: false,
                        companyId
                    },
                    include: {
                        questions: {
                            where: quesWhere,
                            orderBy: {
                                questionOrder: 'asc'
                            }
                        }
                    }

                })

                return { category, message: ResponseMessages.LABEL_UPDATED }
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

    async deleteLabel(user: User, type: string, companyId: number, templateId: number, categoryId: number, labelId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const question = await this.databaseService.templateQuestion.findUnique({
                    where: {
                        id: labelId,
                        categoryId: categoryId,
                        isDeleted: false,
                        questionnaireTemplateId: templateId,
                    }
                })

                if (!question) {
                    throw new BadRequestException(ResponseMessages.LABEL_NOT_FOUND);
                }

                let whereClause: any = {
                    isDeleted: false,
                }

                // Determine template type
                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                if (templateType === TemplateType.SELECTION_INITIAL) {
                    whereClause.linkToInitalSelection = true;
                }

                if (templateType === TemplateType.SELECTION_PAINT) {
                    whereClause.linkToPaintSelection = true;
                }

                const questionOrder = question.questionOrder;

                // delete the template question.
                await this.databaseService.templateQuestion.update({
                    where: {
                        id: labelId,
                        categoryId: categoryId,
                        ...whereClause,
                        questionnaireTemplateId: templateId,
                    },
                    data: {
                        isDeleted: true,
                        questionOrder: 0
                    }
                });

                await this.databaseService.$transaction([
                    this.databaseService.templateQuestionAnswer.deleteMany({
                        where: {
                            questionId: question.id
                        },
                    }),
                    this.databaseService.templateQuestion.update({
                        where: {
                            id: question.id,
                        },
                        data: {
                            isDeleted: true,
                            questionOrder: 0,
                        },
                    }),
                    this.databaseService.templateQuestion.updateMany({
                        where: {
                            questionnaireTemplateId: templateId,
                            categoryId: categoryId,
                            isDeleted: false,
                            ...whereClause,
                            questionOrder: {
                                gt: questionOrder
                            },
                        },
                        data: {
                            questionOrder: {
                                decrement: 1,
                            }
                        }
                    })
                ]);

                // Refetch the categories.
                const category = await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        questionnaireTemplateId: templateId,
                        isCompanyCategory: true,
                        isDeleted: false,
                        companyId
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
                    }
                });

                return { category, message: ResponseMessages.LABEL_DELETED }


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

    async createAnswer(user: User, type: string, companyId: number, templateId: number, categoryId: number, body: AnswerDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                await this.databaseService.templateQuestion.findUniqueOrThrow({
                    where: {
                        id: body.questionId,
                        isDeleted: false,
                    }
                })

                await this.databaseService.templateQuestionAnswer.create({
                    data: {
                        questionId: body.questionId,
                        answerText: body.answerText
                    }
                })

                const category = await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        isCompanyCategory: true,
                        isDeleted: false,
                    },
                    include: {
                        questions: {
                            where: {
                                isDeleted: false,
                            },
                            include: {
                                answers: {},
                            },
                            orderBy: {
                                questionOrder: 'asc'
                            }
                        },
                    }
                });

                return { category: category, message: ResponseMessages.LABEL_CREATED };

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
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

    async updateAnswer(user: User, type: string, companyId: number, templateId: number, categoryId: number, body: AnswerDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const question = await this.databaseService.templateQuestion.findFirst({
                    where: {
                        id: body.questionId
                    }
                })

                if (!question) {
                    throw new Error(ResponseMessages.LABEL_NOT_FOUND);
                }

                const answer = await this.databaseService.templateQuestionAnswer.findFirstOrThrow({
                    where: {
                        questionId: body.questionId
                    }
                })

                await this.databaseService.templateQuestionAnswer.update({
                    where: {
                        id: answer.id
                    },
                    data: {
                        answerText: body.answerText
                    }
                })

                const category = await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        isCompanyCategory: true,
                        isDeleted: false,
                    },
                    include: {
                        questions: {
                            where: {
                                isDeleted: false,
                            },
                            include: {
                                answers: {},
                            },
                            orderBy: {
                                questionOrder: "asc"
                            }
                        },
                    },
                })

                return { category, message: ResponseMessages.QUESTION_UPDATED };
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

    async changeCategoryOrder(
        user: User,
        companyId: number,
        type: string,
        templateId: number,
        body: CategoryOrderDTO
    ) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false,
                    },
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let template =
                    await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                        where: {
                            id: templateId,
                            isCompanyTemplate: true,
                            isDeleted: false,
                        },
                    });
                let category = await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: body.categoryId,
                        questionnaireTemplateId: templateId,
                        isCompanyCategory: true,
                        isDeleted: false,
                    },
                });

                // Determine template type
                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                let categoryWhereClause: any = {
                    isDeleted: false,
                    isCompanyCategory: true,
                }

                let questionWhereClause: any = {
                    questionnaireTemplateId: templateId,
                    categoryId: body.categoryId,
                }
                if (templateType === TemplateType.SELECTION_INITIAL) {
                    categoryWhereClause.linkToInitalSelection = true;
                    questionWhereClause.linkToInitalSelection = true
                }
                if (templateType === TemplateType.SELECTION_PAINT) {
                    categoryWhereClause.linkToPaintSelection = true;
                    questionWhereClause.linkToPaintSelection = true
                }

                let currentOrder = category.questionnaireOrder;

                if (currentOrder > body.questionnaireOrder) {
                    // Category is moving up
                    let result = await this.databaseService.$transaction([
                        this.databaseService.category.updateMany({
                            where: {
                                questionnaireTemplateId: templateId,
                                isCompanyCategory: true,
                                isDeleted: false,
                                questionnaireOrder: {
                                    gte: body.questionnaireOrder,
                                    lt: currentOrder,
                                },
                            },
                            data: {
                                questionnaireOrder: {
                                    increment: 1,
                                },
                            },
                        }),
                        this.databaseService.category.update({
                            where: {
                                id: body.categoryId,
                                questionnaireTemplateId: templateId,
                                isCompanyCategory: true,
                                isDeleted: false,
                            },
                            data: {
                                questionnaireOrder: body.questionnaireOrder,
                            },
                        }),
                        this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                            where: {
                                id: templateId,
                                isDeleted: false,
                                isCompanyTemplate: true,
                            },
                            omit: {
                                companyId: true,
                                isDeleted: true,
                                isCompanyTemplate: false,
                            },
                            include: {
                                categories: {
                                    where: categoryWhereClause,
                                    omit: {
                                        isDeleted: true,
                                        isCompanyCategory: false,
                                        companyId: true,
                                    },
                                    include: {
                                        questions: {
                                            where: questionWhereClause,
                                            orderBy: {
                                                questionOrder: 'asc'
                                            }
                                        },
                                    },
                                    orderBy: {
                                        questionnaireOrder: "asc",
                                    },
                                },
                            },
                        }),
                    ]);

                    return {
                        template: result[2],
                        message: ResponseMessages.CATEGORY_ORDER_UPDATED,
                    };
                } else if (currentOrder < body.questionnaireOrder) {
                    // Category is moving down
                    let result = await this.databaseService.$transaction([
                        this.databaseService.category.updateMany({
                            where: {
                                questionnaireTemplateId: templateId,
                                isCompanyCategory: true,
                                isDeleted: false,
                                questionnaireOrder: {
                                    gt: currentOrder,
                                    lte: body.questionnaireOrder,
                                },
                            },
                            data: {
                                questionnaireOrder: {
                                    decrement: 1,
                                },
                            },
                        }),
                        this.databaseService.category.update({
                            where: {
                                id: body.categoryId,
                                questionnaireTemplateId: templateId,
                                isCompanyCategory: true,
                                isDeleted: false,
                            },
                            data: {
                                questionnaireOrder: body.questionnaireOrder,
                            },
                        }),
                        this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                            where: {
                                id: templateId,
                                isDeleted: false,
                                isCompanyTemplate: true,
                            },
                            omit: {
                                companyId: true,
                                isDeleted: true,
                                isCompanyTemplate: false,
                            },
                            include: {
                                categories: {
                                    where: categoryWhereClause,
                                    omit: {
                                        isDeleted: true,
                                        isCompanyCategory: false,
                                        companyId: true,
                                    },
                                    include: {
                                        questions: {
                                            where: questionWhereClause,
                                            orderBy: {
                                                questionOrder: 'asc'
                                            }
                                        },
                                    },
                                    orderBy: {
                                        questionnaireOrder: "asc",
                                    },
                                },
                            },
                        }),
                    ]);
                    return {
                        template: result[2],
                        message: ResponseMessages.CATEGORY_ORDER_UPDATED,
                    };
                }
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

    // update the template name
    async updateTemplateName(user: User, type: string, companyId: number, templateId: number, body: TemplateNameDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {

                // Determine template type
                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                if (!templateType) {
                    throw new ForbiddenException('Action Not Allowed.');
                }

                await this.databaseService.company.findUniqueOrThrow({
                    where: {
                        id: companyId,
                        isDeleted: false,
                    }
                })

                let template = await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isDeleted: false,
                        isCompanyTemplate: true,
                        companyId
                    },
                })

                template = await this.databaseService.questionnaireTemplate.update({
                    where: {
                        id: templateId,
                        isDeleted: false,
                        isCompanyTemplate: true,
                        companyId
                    },
                    data: {
                        name: body.name
                    }
                });

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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });

                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Determine template type
                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                if (!templateType) {
                    throw new ForbiddenException('Action Not Allowed');
                }

                let categoryWhereClause: any = {
                    questionnaireTemplateId: templateId,
                    isCompanyCategory: true,
                    companyId,
                    isDeleted: false,
                }

                let questionWhereClause: any = {
                    isDeleted: false,
                    categoryId: categoryId,
                    questionnaireTemplateId: templateId
                }

                if (templateType === TemplateType.SELECTION_INITIAL) {
                    categoryWhereClause.linkToInitalSelection = true;
                    questionWhereClause.linkToInitalSelection = true;
                }

                if (templateType === TemplateType.SELECTION_PAINT) {
                    categoryWhereClause.linkToPaintSelection = true
                    questionWhereClause.linkToPaintSelection = true;
                }

                let template = await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isDeleted: false,
                        isCompanyTemplate: true,
                        companyId
                    }
                })

                let category = await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        ...categoryWhereClause
                    },
                });

                let question = await this.databaseService.templateQuestion.findUniqueOrThrow({
                    where: {
                        id: questionId,
                        ...questionWhereClause
                    }
                });

                let currentQuestOrder = question.questionOrder;

                if (currentQuestOrder > body.questionOrder) {
                    // question moving up
                    let result = await this.databaseService.$transaction([
                        this.databaseService.templateQuestion.updateMany({
                            where: {
                                ...questionWhereClause,
                                questionOrder: {
                                    gte: body.questionOrder,
                                    lt: currentQuestOrder
                                }
                            },
                            data: {
                                questionOrder: {
                                    increment: 1,
                                }
                            }
                        }),
                        this.databaseService.templateQuestion.update({
                            where: {
                                id: questionId,
                                ...questionWhereClause
                            },
                            data: {
                                questionOrder: body.questionOrder
                            }
                        }),
                        this.databaseService.category.findMany({
                            where: categoryWhereClause,
                            include: {
                                questions: {
                                    where: questionWhereClause,
                                    orderBy: {
                                        questionOrder: 'asc'
                                    }
                                }
                            },
                            orderBy: {
                                questionnaireOrder: 'asc'
                            }
                        })
                    ]);

                    return {
                        categories: result[2],
                        message: ResponseMessages.QUESTION_ORDER_UPDATED
                    }
                } else if (currentQuestOrder < body.questionOrder) {
                    // question moving down
                    let result = await this.databaseService.$transaction([
                        this.databaseService.templateQuestion.updateMany({
                            where: {
                                ...questionWhereClause,
                                questionOrder: {
                                    gt: currentQuestOrder,
                                    lte: body.questionOrder
                                }
                            },
                            data: {
                                questionOrder: {
                                    decrement: 1,
                                }
                            }
                        }),
                        this.databaseService.templateQuestion.update({
                            where: {
                                id: questionId,
                                ...questionWhereClause
                            },
                            data: {
                                questionOrder: body.questionOrder
                            }
                        }),
                        this.databaseService.category.findMany({
                            where: categoryWhereClause,
                            include: {
                                questions: {
                                    where: questionWhereClause,
                                    orderBy: {
                                        questionOrder: 'asc'
                                    }
                                }
                            },
                            orderBy: {
                                questionnaireOrder: 'asc'
                            }
                        })
                    ]);

                    return {
                        categories: result[2],
                        message: ResponseMessages.QUESTION_ORDER_UPDATED
                    }
                }
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

    async createTemplateName(user: User, companyId: number, type: string, body: TemplateNameDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const company = await this.databaseService.company.findUniqueOrThrow({
                    where: {
                        id: companyId,
                        isDeleted: false,
                    }
                })

                const template = await this.databaseService.questionnaireTemplate.create({
                    data: {
                        name: body.name,
                        templateType: TemplateType.SELECTION_INITIAL,
                        isCompanyTemplate: true,
                        companyId,
                    },
                    omit: {
                        isDeleted: false
                    }
                })

                return { template, message: ResponseMessages.QUESTIONNAIRE_TEMPLATE_UPDATED }
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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const templateType = {
                    'initial-selection': TemplateType.SELECTION_INITIAL,
                    'paint-selection': TemplateType.SELECTION_PAINT,
                }[type];

                if (!templateType) {
                    throw new ForbiddenException("Action Not Allowed.");
                }

                await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isDeleted: false,
                        isCompanyTemplate: true,
                        companyId
                    }
                });

                await this.databaseService.$transaction([
                    this.databaseService.questionnaireTemplate.update({
                        where: {
                            id: templateId,
                        },
                        data: {
                            isDeleted: true,
                        }
                    }),
                    this.databaseService.category.updateMany({
                        where: {
                            questionnaireTemplateId: templateId,
                            isDeleted: false,
                        },
                        data: {
                            isDeleted: true,
                        }
                    }),
                    this.databaseService.templateQuestion.updateMany({
                        where: {
                            questionnaireTemplateId: templateId,
                            isDeleted: false,
                        },
                        data: {
                            isDeleted: true,
                        }
                    }),
                ]);

                let whereClause: any = {
                    isDeleted: false,
                }

                if (templateType === TemplateType.SELECTION_INITIAL) {
                    whereClause.linkToInitalSelection = true;
                }
                if (templateType === TemplateType.SELECTION_PAINT) {
                    whereClause.linkToPaintSelection = true
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
}