import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateQuestionnaireTemplateDTO, UpdateQuestionnaireTemplateDTO } from '../validators';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages } from 'src/core/utils';

@Injectable()
export class AdminQuestionnaireTemplateService {
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
                    companyId: true,
                    isDeleted: true,
                    isCompanyTemplate: true
                },
                include: {
                    categories: {
                        where: {
                            isDeleted: false,
                            isCompanyCategory: false,
                        },
                        omit: {
                            isDeleted: true,
                            isCompanyCategory: true,
                            companyId: true
                        },
                        include: {
                            questions: {
                                omit: {
                                    isDeleted: true,
                                    categoryId: true,
                                    questionnaireTemplateId: true
                                },
                            }
                        },
                        orderBy: {
                            questionnaireOrder: 'asc'
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
                    isCompanyTemplate: false,
                    isDeleted: false,
                },
                omit: {
                    companyId: true,
                    isDeleted: true,
                    isCompanyTemplate: true
                },
                include: {
                    categories: {
                        where: {
                            isDeleted: false,
                            isCompanyCategory: false,
                        },
                        omit: {
                            isDeleted: true,
                            isCompanyCategory: true,
                            companyId: true
                        },
                        include: {
                            questions: {
                                omit: {
                                    isDeleted: true,
                                    categoryId: true,
                                    questionnaireTemplateId: true
                                },
                            }
                        },
                        orderBy: {
                            questionnaireOrder: 'asc'
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
                    throw new BadRequestException(ResponseMessages.QUESTIONNAIRE_TEMPLATE_NOT_FOUND);
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
                    isDeleted: false,
                    isCompanyTemplate: false
                },
                omit: {
                    companyId: true,
                    isDeleted: true,
                    isCompanyTemplate: true
                },
                include: {
                    categories: {
                        where: {
                            isDeleted: false,
                            isCompanyCategory: false,
                        },
                        omit: {
                            isDeleted: true,
                            isCompanyCategory: true,
                            companyId: true
                        },
                        include: {
                            questions: {
                                omit: {
                                    isDeleted: true,
                                    categoryId: true,
                                    questionnaireTemplateId: true
                                },
                            }
                        },
                        orderBy: {
                            questionnaireOrder: 'asc'
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
                    throw new BadRequestException(ResponseMessages.QUESTIONNAIRE_TEMPLATE_NOT_FOUND);
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
                    isDeleted: false,
                    isCompanyTemplate: false
                },
                data: {
                    name: body.name
                },
                omit: {
                    companyId: true,
                    isDeleted: true,
                    isCompanyTemplate: true
                },
                include: {
                    categories: {
                        where: {
                            isDeleted: false,
                            isCompanyCategory: false,
                        },
                        omit: {
                            isDeleted: true,
                            isCompanyCategory: true,
                            companyId: true
                        },
                        include: {
                            questions: {
                                omit: {
                                    isDeleted: true,
                                    categoryId: true,
                                    questionnaireTemplateId: true
                                },
                            }
                        },
                        orderBy: {
                            questionnaireOrder: 'asc'
                        }
                    }
                }
            });
            return { template, message: ResponseMessages.QUESTIONNAIRE_TEMPLATE_UPDATED }
        } catch (error) {
            console.log(error);
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
    async deleteQuestionnaireTemplate(templateId: number) {
        try {
            await this.databaseService.$transaction([
                this.databaseService.questionnaireTemplate.update({
                    where: {
                        id: templateId,
                        isDeleted: false,
                        isCompanyTemplate: false
                    },
                    data: {
                        isDeleted: true
                    }
                }),
                this.databaseService.category.updateMany({
                    where: {
                        questionnaireTemplateId: templateId,
                        isDeleted: false,
                        isCompanyCategory: false
                    },
                    data: {
                        isDeleted: true
                    }
                }),
                this.databaseService.templateQuestion.updateMany({
                    where: {
                        questionnaireTemplateId: templateId,
                        isDeleted: false,
                    },
                    data: {
                        isDeleted: true
                    }
                })
            ]);
            return { message: ResponseMessages.QUESTIONNAIRE_TEMPLATE_DELETED }
        } catch (error) {
            console.log(error);
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
