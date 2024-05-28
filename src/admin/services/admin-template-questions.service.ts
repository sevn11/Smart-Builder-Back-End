import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages } from 'src/core/utils';
import { UpdateQuestionDTO, CreateQuestionDTO } from '../validators';

@Injectable()
export class AdminTemplateQuestionsService {
    constructor(private readonly databaseService: DatabaseService) {

    }
    async createQuestion(categoryId: number, body: CreateQuestionDTO) {
        try {
            let category = await this.databaseService.category.findUniqueOrThrow({
                where: {
                    id: categoryId,
                    isCompanyCategory: false,
                    isDeleted: false,
                },
            });
            let question = await this.databaseService.templateQuestion.create({
                data: {
                    question: body.question,
                    questionType: body.questionType,
                    multipleOptions: body.multipleOptions,
                    linkToPhase: body.linkToPhase,
                    linkToInitialSelection: body.linkToInitialSelection,
                    linkToPaintSelection: body.linkToPaintSelection,
                    questionnaireTemplateId: category.questionnaireTemplateId,
                    categoryId: category.id
                },
                omit: {
                    isDeleted: true,
                    questionnaireTemplateId: true,
                    categoryId: true
                }
            });
            return { question }
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
    async getQuestionList(categoryId: number) {
        try {
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
    async getQuestionDetail(categoryId: number, questionId: number) {
        try {
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
    async updateQuestion(categoryId: number, questionId: number, body: UpdateQuestionDTO) {
        try {
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
            question = await this.databaseService.templateQuestion.update({
                where: {
                    id: questionId,
                    categoryId: categoryId,
                    isDeleted: false,
                },
                data: {
                    question: body.question,
                    questionType: body.questionType,
                    multipleOptions: body.multipleOptions,
                    linkToPhase: body.linkToPhase,
                    linkToInitialSelection: body.linkToInitialSelection,
                    linkToPaintSelection: body.linkToPaintSelection
                },
                omit: {
                    isDeleted: true,
                }
            })

            return { question, message: ResponseMessages.QUESTION_UPDATED }
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
    async deleteQuestion(categoryId: number, questionId: number) {
        try {
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
            question = await this.databaseService.templateQuestion.update({
                where: {
                    id: questionId,
                    categoryId: categoryId,
                    isDeleted: false,
                },
                data: {
                    isDeleted: true,
                },
            })

            return { message: ResponseMessages.QUESTION_DELETED }
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
}
