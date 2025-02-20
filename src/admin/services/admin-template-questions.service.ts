import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { CreateUpdateQuestionDTO } from '../validators/questionnaire/create-update-question';
import { User } from '@prisma/client';
import { QuestionOrderDTO } from '../validators/questionnaire/order';
import { SelectionTemplates } from 'src/core/utils/selection-template';


@Injectable()
export class AdminTemplateQuestionService {

    constructor(private databaseService: DatabaseService) { }

    async createQuestion(user: User, templateId: number, categoryId: number, body: CreateUpdateQuestionDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {

                // Get the highest question order for the given templateId and categoryId
                let maxOrder = await this.databaseService.masterTemplateQuestion.aggregate({
                    _max: { questionOrder: true, initialQuestionOrder: true, paintQuestionOrder: true },
                    where: { masterQuestionnaireTemplateId: templateId, masterTemplateCategoryId: categoryId, isDeleted: false, }
                });

                // Find the category if it exists and is not deleted.
                let categoryItem = await this.databaseService.masterTemplateCategory.findUniqueOrThrow({
                    where: { id: categoryId, isDeleted: false }
                });

                let { _max: catAggregate } = await this.databaseService.masterTemplateCategory.aggregate({
                    _max: { questionnaireOrder: true, initialOrder: true, paintOrder: true },
                    where: { masterQuestionnaireTemplateId: templateId, isDeleted: false, }
                });

                // set the update data.
                const updateData = {
                    ...(body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION) &&
                        !categoryItem.linkToInitalSelection &&
                    {
                        linkToInitalSelection: true,
                        initialOrder: (catAggregate.initialOrder ?? 0) + 1,
                    }
                    ),
                    ...(body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION) &&
                        !categoryItem.linkToPaintSelection &&
                    {
                        linkToPaintSelection: true,
                        paintOrder: (catAggregate.paintOrder ?? 0) + 1
                    }
                    )
                };

                let selQuestionOrder: any = {}

                if (body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION)) {
                    selQuestionOrder.initialQuestionOrder = (maxOrder._max.initialQuestionOrder ?? 0) + 1;
                }

                if (body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION)) {
                    selQuestionOrder.paintQuestionOrder = (maxOrder._max.paintQuestionOrder ?? 0) + 1;
                }

                // Update the category if there are changes to be made.
                if (Object.keys(updateData).length > 0) {
                    categoryItem = await this.databaseService.masterTemplateCategory.update({
                        where: { id: categoryId, isDeleted: false, },
                        data: updateData
                    });
                }

                // if body.questionOrder = 0 , set it to maxOrder + 1
                let order = body.questionOrder === 0
                    ? (maxOrder._max.questionOrder ?? 0) + 1
                    : body.questionOrder
                // create the question
                let question = await this.databaseService.masterTemplateQuestion.create({
                    data: {
                        question: body.question,
                        questionType: body.type,
                        multipleOptions: body.multipleOptions,
                        linkToPhase: body.isQuestionLinkedPhase,
                        questionOrder: order,
                        linkToInitalSelection: body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION),
                        linkToPaintSelection: body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION),
                        masterQuestionnaireTemplateId: templateId,
                        masterTemplateCategoryId: categoryId,
                        phaseIds: body.phaseIds,
                        ...selQuestionOrder
                    },
                    omit: {
                        isDeleted: true,
                        masterQuestionnaireTemplateId: true,
                        masterTemplateCategoryId: true
                    }
                });

                // Fetch the updated category with updated questions
                const category = await this.databaseService.masterTemplateCategory.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        isDeleted: false,
                        linkToQuestionnaire: true,
                    },
                    include: {
                        masterQuestions: {
                            where: {
                                isDeleted: false,
                                linkToQuestionnaire: true,
                            },
                            orderBy: { questionOrder: 'asc' }
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

    async getQuestionList(user: User, templateId: number, categoryId: number) {
        try {

            // Check if User is Admin of the Company.

            if (user.userType == UserTypes.ADMIN) {
                
                let questions = await this.databaseService.masterTemplateQuestion.findMany({
                    where: {
                        masterTemplateCategoryId: categoryId,
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
    async getQuestionDetail(user: User, templateId: number, categoryId: number, questionId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {
                let question = await this.databaseService.masterTemplateQuestion.findUniqueOrThrow({
                    where: {
                        id: questionId,
                        masterTemplateCategoryId: categoryId,
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

    async updateQuestion(user: User, templateId: number, categoryId: number, questionId: number, body: CreateUpdateQuestionDTO) {
        try {

            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {

                let categoryItem = await this.databaseService.masterTemplateCategory.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        isDeleted: false,
                    }
                });

                let templateQuestion = await this.databaseService.masterTemplateQuestion.findUnique({
                    where: {
                        id: questionId,
                        masterTemplateCategoryId: categoryId,
                        isDeleted: false,
                        masterQuestionnaireTemplateId: templateId
                    }
                })

                let maxOrder = await this.databaseService.masterTemplateQuestion.aggregate({
                    _max: {
                        questionOrder: true,
                        initialQuestionOrder: true,
                        paintQuestionOrder: true
                    },
                    where: {
                        masterTemplateCategoryId: categoryId,
                        isDeleted: false,
                    }
                })
                if (!categoryItem.linkToInitalSelection || !categoryItem.linkToPaintSelection) {

                    let { _max: maxOrders } = await this.databaseService.masterTemplateCategory.aggregate({
                        _max: { questionnaireOrder: true, initialOrder: true, paintOrder: true },
                        where: { masterQuestionnaireTemplateId: templateId, isDeleted: false }
                    });
                    const updatePayload: Record<string, any> = {};

                    if (body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION) && !categoryItem.linkToInitalSelection) {
                        updatePayload.initialOrder = (maxOrders.initialOrder ?? 0) + 1;
                        updatePayload.linkToInitalSelection = true;
                    }

                    if (body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION) && !categoryItem.linkToPaintSelection) {
                        updatePayload.paintOrder = (maxOrders.paintOrder ?? 0) + 1;
                        updatePayload.linkToPaintSelection = true;
                    }

                    // Update only if there's data to update
                    if (Object.keys(updatePayload).length > 0) {
                        categoryItem = await this.databaseService.masterTemplateCategory.update({
                            where: { id: categoryId, isDeleted: false },
                            data: updatePayload,
                        });
                    }
                }

                let selQuestionOrder: any = {}
                if (templateQuestion.initialQuestionOrder === 0 && body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION)) {
                    selQuestionOrder.initialQuestionOrder = (maxOrder._max.initialQuestionOrder ?? 0) + 1;
                } else {
                    selQuestionOrder.initialQuestionOrder = templateQuestion.initialQuestionOrder
                }

                if (templateQuestion.paintQuestionOrder === 0 && body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION)) {
                    selQuestionOrder.paintQuestionOrder = (maxOrder._max.paintQuestionOrder ?? 0) + 1;
                } else {
                    selQuestionOrder.paintQuestionOrder = templateQuestion.paintQuestionOrder
                }

                const initialValue = templateQuestion.initialQuestionOrder;
                const paintValue = templateQuestion.paintQuestionOrder;
                let decrement = { initialOrder: false, paintOrder: false };
                if (!body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION) && templateQuestion.linkToPaintSelection) {
                    decrement.paintOrder = true;
                    selQuestionOrder.paintQuestionOrder = 0
                }
                if (!body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION) && templateQuestion.linkToInitalSelection) {
                    decrement.initialOrder = true;
                    selQuestionOrder.initialQuestionOrder = 0
                }
                await this.databaseService.$transaction(async (tx) => {
                    await tx.masterTemplateQuestion.update({
                        where: {
                            id: questionId,
                            masterTemplateCategoryId: categoryId,
                            isDeleted: false,
                        },
                        data: {
                            question: body.question,
                            questionType: body.type,
                            multipleOptions: body.multipleOptions,
                            linkToPhase: body.isQuestionLinkedPhase,
                            linkToInitalSelection: body.linkedSelections.includes(SelectionTemplates.INITIAL_SELECTION),
                            linkToPaintSelection: body.linkedSelections.includes(SelectionTemplates.PAINT_SELECTION),
                            phaseIds: body.phaseIds,
                            ...selQuestionOrder
                        },
                        omit: {
                            isDeleted: true,
                        }
                    });

                    if (decrement.initialOrder) {
                        await tx.masterTemplateQuestion.updateMany({
                            where: {
                                isDeleted: false,
                                masterTemplateCategoryId: categoryId,
                                initialQuestionOrder: { gt: initialValue }
                            },
                            data: { initialQuestionOrder: { decrement: 1 } }
                        })
                    }

                    if (decrement.paintOrder) {
                        await tx.masterTemplateQuestion.updateMany({
                            where: {
                                isDeleted: false,
                                masterTemplateCategoryId: categoryId,
                                paintQuestionOrder: { gt: paintValue }
                            },
                            data: { paintQuestionOrder: { decrement: 1 } }
                        })
                    }
                });
                // Fetch the updated category with updated questions
                const category = await this.databaseService.masterTemplateCategory.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        isDeleted: false,
                        linkToQuestionnaire: true,
                    },
                    include: {
                        masterQuestions: {
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

    async deleteQuestion(user: User, templateId: number, categoryId: number, questionId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType === UserTypes.ADMIN) {

                // Fetch the question to ensure it exists
                const question = await this.databaseService.masterTemplateQuestion.findUnique({
                    where: {
                        id: questionId,
                        masterTemplateCategoryId: categoryId,
                        isDeleted: false,
                    },
                });

                if (!question) {
                    throw new BadRequestException(ResponseMessages.QUESTION_NOT_FOUND);
                }

                const deletedQuesOrder = question.questionOrder;
                const deletedInitial = question.initialQuestionOrder;
                const deletedPaint = question.paintQuestionOrder;

                await this.databaseService.$transaction(async (tx) => {
                    // await tx.templateQuestionAnswer.deleteMany({
                    //     where: {
                    //         questionId: questionId
                    //     }
                    // });
                    await tx.masterTemplateQuestion.update({
                        where: { id: questionId },
                        data: {
                            isDeleted: true,
                            questionOrder: 0,
                            initialQuestionOrder: 0,
                            paintQuestionOrder: 0
                        }
                    });
                    // Arrange the order of questionnaire template questions
                    await tx.masterTemplateQuestion.updateMany({
                        where: {
                            masterQuestionnaireTemplateId: templateId,
                            masterTemplateCategoryId: categoryId,
                            isDeleted: false,
                            questionOrder: {
                                gt: deletedQuesOrder
                            }
                        },
                        data: {
                            questionOrder: { decrement: 1 },
                        }
                    });
                    if (deletedInitial > 0) {
                        await tx.masterTemplateQuestion.updateMany({
                            where: {
                                masterQuestionnaireTemplateId: templateId,
                                masterTemplateCategoryId: categoryId,
                                isDeleted: false,
                                initialQuestionOrder: {
                                    gt: deletedInitial
                                }
                            },
                            data: { initialQuestionOrder: { decrement: 1 } }
                        })
                    }
                    if (deletedPaint > 0) {
                        await tx.masterTemplateQuestion.updateMany({
                            where: {
                                masterQuestionnaireTemplateId: templateId,
                                masterTemplateCategoryId: categoryId,
                                isDeleted: false,
                                paintQuestionOrder: {
                                    gt: deletedPaint
                                }
                            },
                            data: { paintQuestionOrder: { decrement: 1 } }
                        })
                    }
                });
                // Fetch the updated category with non-deleted questions
                const category = await this.databaseService.masterTemplateCategory.findMany({
                    where: {
                        masterQuestionnaireTemplateId: templateId,
                        linkToQuestionnaire: true,
                        isDeleted: false,
                    },
                    include: {
                        masterQuestions: {
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

    async updateOrder(user: User, templateId: number, categoryId: number, questionId: number, body: QuestionOrderDTO) {
        try {

            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {

                let template = await this.databaseService.masterQuestionnaireTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isDeleted: false,
                    }
                });
                let category = await this.databaseService.masterTemplateCategory.findUniqueOrThrow({
                    where: {
                        id: categoryId,
                        masterQuestionnaireTemplateId: templateId,
                        isDeleted: false,
                    }
                });

                let question = await this.databaseService.masterTemplateQuestion.findUniqueOrThrow({
                    where: {
                        id: questionId,
                        masterQuestionnaireTemplateId: template.id,
                        masterTemplateCategoryId: category.id,
                        isDeleted: false,
                    }
                })

                const currentQuesOrder = question.questionOrder

                if (currentQuesOrder > body.questionOrder) {
                    let result = await this.databaseService.$transaction([
                        this.databaseService.masterTemplateQuestion.updateMany({
                            where: {
                                masterQuestionnaireTemplateId: template.id,
                                masterTemplateCategoryId: category.id,
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
                        this.databaseService.masterTemplateQuestion.update({
                            where: {
                                id: questionId,
                                masterQuestionnaireTemplateId: template.id,
                                masterTemplateCategoryId: category.id,
                                isDeleted: false,
                            },
                            data: {
                                questionOrder: body.questionOrder
                            }
                        }),
                        this.databaseService.masterTemplateCategory.findMany({
                            where: {
                                masterQuestionnaireTemplateId: templateId,
                                isDeleted: false,
                                linkToQuestionnaire: true,
                            },
                            include: {
                                masterQuestions: {
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
                        this.databaseService.masterTemplateQuestion.updateMany({
                            where: {
                                masterQuestionnaireTemplateId: template.id,
                                masterTemplateCategoryId: category.id,
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
                        this.databaseService.masterTemplateQuestion.update({
                            where: {
                                id: questionId,
                                masterQuestionnaireTemplateId: template.id,
                                masterTemplateCategoryId: category.id,
                                isDeleted: false,
                            },
                            data: {
                                questionOrder: body.questionOrder
                            }
                        }),
                        this.databaseService.masterTemplateCategory.findMany({
                            where: {
                                masterQuestionnaireTemplateId: templateId,
                                isDeleted: false,
                                linkToQuestionnaire: true,
                            },
                            include: {
                                masterQuestions: {
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