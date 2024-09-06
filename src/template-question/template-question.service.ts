import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { CreateUpdateQuestionDTO } from './validators/create-update-question';
import { User } from '@prisma/client';


@Injectable()
export class TemplateQuestionService {

    constructor(private databaseService: DatabaseService) { }

    async createQuestion(user: User, companyId: number, templateId: number, categoryId: number, body: CreateUpdateQuestionDTO) {
        try {
            // Check if User is Admin of the Company.
            console.log(body)
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


                let question = await this.databaseService.templateQuestion.create({
                    data: {
                        question: body.question,
                        questionType: body.type,
                        multipleOptions: body.multipleOptions,
                        linkToPhase: body.isQuestionLinkedPhase,
                        linkToInitalSelection: body.isQuestionLinkedSelections,
                        linkToPaintSelection: body.isQuestionLinkedSelections,
                        questionnaireTemplateId: templateId,
                        categoryId: categoryId,
                        phaseId: body.linkedPhase || null
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
                    },
                    include: {
                        questions: {
                            where: {
                                isDeleted: false,
                            },

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
                    },
                    omit: {
                        isDeleted: true
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
                        linkToInitalSelection: body.isQuestionLinkedSelections,
                        linkToPaintSelection: body.isQuestionLinkedSelections,
                        phaseId: body.linkedPhase || null
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
                    },
                    include: {
                        questions: {
                            where: {
                                isDeleted: false,
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

                // Delete the corresponding answer(s) for the question
                await this.databaseService.templateQuestionAnswer.deleteMany({
                    where: {
                        questionId: questionId
                    }
                });

                // Mark the question as deleted
                await this.databaseService.templateQuestion.update({
                    where: {
                        id: questionId,
                    },
                    data: {
                        isDeleted: true,
                    },
                });

                // Fetch the updated category with non-deleted questions
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
                        },
                    },
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
}