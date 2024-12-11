import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { CreateUpdateQuestionDTO } from './validators/create-update-question';
import { User } from '@prisma/client';
import { QuestionOrderDTO } from './validators/order';
import { SelectionTemplates } from 'src/core/utils/selection-template';


@Injectable()
export class TemplateQuestionService {

    constructor(private databaseService: DatabaseService) { }

    async createQuestion(user: User, companyId: number, templateId: number, categoryId: number, body: CreateUpdateQuestionDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });
                if (!company) throw new ForbiddenException("Action Not Allowed");

                // Get the highest question order for the given templateId and categoryId
                let maxOrder = await this.databaseService.templateQuestion.aggregate({
                    _max: {
                        questionOrder: true,
                    },
                    where: {
                        questionnaireTemplateId: templateId,
                        categoryId: categoryId,
                        isDeleted: false,
                    }
                })

                // Find the category if it exists and is not deleted.
                let categoryItem = await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        isDeleted: false,
                    }
                });
                // set the update data.
                const updateData = {
                    ...(body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION) && !categoryItem.linkToInitalSelection && { linkToInitalSelection: true }),
                    ...(body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION) && !categoryItem.linkToPaintSelection && { linkToPaintSelection: true })
                };

                // Update the category if there are changes to be made.
                if (Object.keys(updateData).length > 0) {
                    categoryItem = await this.databaseService.category.update({
                        where: {
                            id: categoryId,
                            isDeleted: false,
                        },
                        data: updateData
                    });
                }

                // if body.questionOrder = 0 , set it to maxOrder + 1
                let order = body.questionOrder === 0
                    ? (maxOrder._max.questionOrder ?? 0) + 1
                    : body.questionOrder
                // create the question
                let question = await this.databaseService.templateQuestion.create({
                    data: {
                        question: body.question,
                        questionType: body.type,
                        multipleOptions: body.multipleOptions,
                        linkToPhase: body.isQuestionLinkedPhase,
                        questionOrder: order,
                        linkToInitalSelection: body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION),
                        linkToPaintSelection: body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION),
                        questionnaireTemplateId: templateId,
                        categoryId: categoryId,
                        phaseIds: body.phaseIds
                    },
                    omit: {
                        isDeleted: true,
                        questionnaireTemplateId: true,
                        categoryId: true
                    }
                });
                // Fetch the updated category with updated questions
                const category = await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        isCompanyCategory: true,
                        isDeleted: false,
                        linkToQuestionnaire: true,
                    },
                    include: {
                        questions: {
                            where: {
                                isDeleted: false,
                                linkToQuestionnaire: true,
                            },
                            orderBy: {
                                questionOrder: 'asc'
                            }

                        }
                    }
                });

                return { questionId: question.id, category, message: ResponseMessages.QUESTION_ADDED };
            }
        } catch (error) {
            console.log(error)
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.QUESTION_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    async getQuestionList(user: User, companyId: number, templateId: number, categoryId: number) {
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
                let questions = await this.databaseService.templateQuestion.findMany({
                    where: {
                        categoryId: categoryId,
                        isDeleted: false,
                        linkToQuestionnaire: true,
                    },
                    omit: {
                        isDeleted: true
                    },
                    orderBy: {
                        questionOrder: 'asc'
                    }
                });

                return { questions }
            }
        } catch (error) {
            console.log(error)
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.QUESTION_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }
    async getQuestionDetail(user: User, companyId: number, templateId: number, categoryId: number, questionId: number) {
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
                let question = await this.databaseService.templateQuestion.findUniqueOrThrow({
                    where: {
                        id: questionId,
                        categoryId: categoryId,
                        isDeleted: false,
                        linkToQuestionnaire: true,
                    },
                    omit: {
                        isDeleted: true
                    }
                });

                return { question }
            }
        } catch (error) {
            console.log(error)
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.QUESTION_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    async updateQuestion(user: User, companyId: number, templateId: number, categoryId: number, questionId: number, body: CreateUpdateQuestionDTO) {
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

                let categoryItem = await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        isDeleted: false,
                    }
                });

                if (!categoryItem.linkToInitalSelection || !categoryItem.linkToPaintSelection) {
                    const updateData = {
                        ...(
                            body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION) &&
                            !categoryItem.linkToInitalSelection &&
                            { linkToInitalSelection: true }
                        ),
                        ...(
                            body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION) &&
                            !categoryItem.linkToPaintSelection &&
                            { linkToPaintSelection: true }
                        )
                    }

                    // Update the category if there are changes to be made.
                    if (Object.keys(updateData).length > 0) {
                        categoryItem = await this.databaseService.category.update({
                            where: {
                                id: categoryId,
                                isDeleted: false,
                            },
                            data: updateData
                        });
                    }
                }

                let question = await this.databaseService.templateQuestion.update({
                    where: {
                        id: questionId,
                        categoryId: categoryId,
                        isDeleted: false,
                    },
                    data: {
                        question: body.question,
                        questionType: body.type,
                        multipleOptions: body.multipleOptions,
                        linkToPhase: body.isQuestionLinkedPhase,
                        linkToInitalSelection: body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION),
                        linkToPaintSelection: body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION),
                        phaseIds: body.phaseIds
                    },
                    omit: {
                        isDeleted: true,
                    }
                })
                // Fetch the updated category with updated questions
                const category = await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        isCompanyCategory: true,
                        isDeleted: false,
                        linkToQuestionnaire: true,
                    },
                    include: {
                        questions: {
                            where: {
                                isDeleted: false,
                                linkToQuestionnaire: true,
                            },
                            orderBy: {
                                questionOrder: 'asc'
                            },
                        }
                    }
                });

                return { category, message: ResponseMessages.QUESTION_UPDATED };
            }
        } catch (error) {
            console.log(error)
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.QUESTION_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    async deleteQuestion(user: User, companyId: number, templateId: number, categoryId: number, questionId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType === UserTypes.ADMIN || (user.userType === UserTypes.BUILDER && user.companyId === companyId)) {
                // Verify the company exists and is not deleted
                const company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });

                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Fetch the question to ensure it exists
                const question = await this.databaseService.templateQuestion.findUnique({
                    where: {
                        id: questionId,
                        categoryId: categoryId,
                        isDeleted: false,
                    },
                });

                if (!question) {
                    throw new BadRequestException(ResponseMessages.QUESTION_NOT_FOUND);
                }

                const deletedQuesOrder = question.questionOrder;

                await this.databaseService.$transaction([
                    this.databaseService.templateQuestionAnswer.deleteMany({
                        where: {
                            questionId: questionId
                        },
                    }),
                    this.databaseService.templateQuestion.update({
                        where: {
                            id: questionId,
                        },
                        data: {
                            isDeleted: true,
                            questionOrder: 0, // Set the order to 0 for the deleted template
                        }
                    }),
                    this.databaseService.templateQuestion.updateMany({
                        where: {
                            questionnaireTemplateId: templateId,
                            categoryId: categoryId,
                            isDeleted: false,
                            questionOrder: {
                                gt: deletedQuesOrder
                            }
                        },
                        data: {
                            questionOrder: {
                                decrement: 1,
                            }
                        }
                    })
                ]);

                // Fetch the updated category with non-deleted questions
                const category = await this.databaseService.category.findMany({
                    where: {
                        questionnaireTemplateId: templateId,
                        isCompanyCategory: true,
                        linkToQuestionnaire: true,
                        isDeleted: false,
                    },
                    include: {
                        questions: {
                            where: {
                                isDeleted: false,
                                linkToQuestionnaire: true,
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

                return { category, message: ResponseMessages.QUESTION_DELETED };
            }
        } catch (error) {
            console.log(error);

            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.QUESTION_NOT_FOUND);
                } else {
                    console.log(error.code);
                }
            }

            throw new InternalServerErrorException();
        }
    }

    async updateOrder(user: User, companyId: number, templateId: number, categoryId: number, questionId: number, body: QuestionOrderDTO) {
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
                    }
                })

                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let template = await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isCompanyTemplate: true,
                        isDeleted: false,
                    }
                });
                let category = await this.databaseService.category.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        questionnaireTemplateId: templateId,
                        isCompanyCategory: true,
                        isDeleted: false,
                    }
                });

                let question = await this.databaseService.templateQuestion.findUniqueOrThrow({
                    where: {
                        id: questionId,
                        questionnaireTemplateId: template.id,
                        categoryId: category.id,
                        isDeleted: false,
                    }
                })

                const currentQuesOrder = question.questionOrder

                if (currentQuesOrder > body.questionOrder) {
                    let result = await this.databaseService.$transaction([
                        this.databaseService.templateQuestion.updateMany({
                            where: {
                                questionnaireTemplateId: template.id,
                                categoryId: category.id,
                                isDeleted: false,
                                questionOrder: {
                                    gte: body.questionOrder,
                                    lt: currentQuesOrder,
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
                                questionnaireTemplateId: template.id,
                                categoryId: category.id,
                                isDeleted: false,
                            },
                            data: {
                                questionOrder: body.questionOrder
                            }
                        }),
                        this.databaseService.category.findMany({
                            where: {
                                questionnaireTemplateId: templateId,
                                isCompanyCategory: true,
                                isDeleted: false,
                                linkToQuestionnaire: true,
                            },
                            include: {
                                questions: {
                                    where: {
                                        isDeleted: false,
                                        linkToQuestionnaire: true,
                                    },
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
                        message: ResponseMessages.QUESTION_ORDER_UPDATED,
                    }
                } else if (currentQuesOrder < body.questionOrder) {
                    let result = await this.databaseService.$transaction([
                        this.databaseService.templateQuestion.updateMany({
                            where: {
                                questionnaireTemplateId: template.id,
                                categoryId: category.id,
                                isDeleted: false,
                                questionOrder: {
                                    gt: currentQuesOrder,
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
                                questionnaireTemplateId: template.id,
                                categoryId: category.id,
                                isDeleted: false,
                            },
                            data: {
                                questionOrder: body.questionOrder
                            }
                        }),
                        this.databaseService.category.findMany({
                            where: {
                                questionnaireTemplateId: templateId,
                                isCompanyCategory: true,
                                isDeleted: false,
                                linkToQuestionnaire: true,
                            },
                            include: {
                                questions: {
                                    where: {
                                        isDeleted: false,
                                        linkToQuestionnaire: true
                                    },
                                    orderBy: {
                                        questionOrder: 'asc'
                                    }
                                }
                            },
                            orderBy: {
                                questionnaireOrder: 'asc'
                            }
                        })
                    ])
                    return {
                        categories: result[2],
                        message: ResponseMessages.QUESTION_ORDER_UPDATED,
                    }
                } else {
                    throw new ForbiddenException("Unable to change the order.");
                }


            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);

            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                } else {
                    console.log(error.code);
                }
            }

            throw new InternalServerErrorException();
        }
    }
}