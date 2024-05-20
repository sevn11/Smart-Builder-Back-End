import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateQuestionDTO } from '../validators/create-question';
import { DatabaseService } from 'src/database/database.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages } from 'src/core/utils';

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
                    linkToSelection: body.linkToSelection,
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
                    throw new BadRequestException(ResponseMessages.QUESTIONNAIRE_TEMPLATE_NOT_FOUND);
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
                    throw new BadRequestException(ResponseMessages.QUESTIONNAIRE_TEMPLATE_NOT_FOUND);
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
                    throw new BadRequestException(ResponseMessages.QUESTIONNAIRE_TEMPLATE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }
}
