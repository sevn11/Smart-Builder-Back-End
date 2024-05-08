import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateQuestionnaireTemplateDTO, UpdateQuestionnaireTemplateDTO } from './validators';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages } from 'src/core/utils';

@Injectable()
export class AdminService {
    constructor(private databaseService: DatabaseService) {

    }
    async createQuestionnaireTemplate(body: CreateQuestionnaireTemplateDTO) {
        try {
            let template = await this.databaseService.questionnaireTemplate.create({
                data: {
                    name: body.name,
                    isCompanyTemplate: false
                },
                omit: {
                    companyId: true
                },
                include: {
                    categories: {
                        include: {
                            questions: true
                        }
                    }
                }
            });
            return { template }
        } catch (error) {
            console.log(error)
            throw new InternalServerErrorException();
        }
    }
    async getQuestionnaireTemplateList() {
        try {
            let templates = await this.databaseService.questionnaireTemplate.findMany({
                where: {
                    isCompanyTemplate: false
                },
                omit: {
                    companyId: true
                },
                include: {
                    categories: {
                        include: {
                            questions: true
                        }
                    }
                }
            });
            return { templates }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException()
        }
    }
    async getQuestionnaireTemplate(templateId: number) {
        try {
            let template = await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                where: {
                    id: templateId,
                    isCompanyTemplate: false
                },
                omit: {
                    companyId: true
                },
                include: {
                    categories: {
                        include: {
                            questions: true
                        }
                    }
                }
            });
            return { template }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException()
        }
    }
    async updateQuestionnaireTemplate(templateId: number, body: UpdateQuestionnaireTemplateDTO) {
        try {
            let template = await this.databaseService.questionnaireTemplate.update({
                where: {
                    id: templateId,
                    isCompanyTemplate: false
                },
                data: {
                    name: body.name
                },
                omit: {
                    companyId: true
                },
                include: {
                    categories: {
                        include: {
                            questions: true
                        }
                    }
                }
            });
            return { template }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException()
        }
    }
}
