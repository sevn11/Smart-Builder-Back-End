import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateCategoryDTO, UpdateCategoryDTO, UpdateCategoryOrderDTO } from '../validators';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages } from 'src/core/utils';

@Injectable()
export class AdminCategoriesService {
    constructor(private databaseService: DatabaseService) {

    }
    async createCategory(templateId: number, body: CreateCategoryDTO) {
        try {
            let template = await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                where: {
                    id: templateId,
                    isCompanyTemplate: false,
                    isDeleted: false,

                },
            });
            let category = await this.databaseService.category.create({
                data: {
                    name: body.name,
                    isCompanyCategory: false,
                    questionnaireOrder: body.questionnaireOrder,
                    linkToPhase: body.linkToPhase,
                    linkToSelection: body.linkToSelection,
                    questionnaireTemplateId: template.id
                },
                omit: {
                    isDeleted: true,
                    isCompanyCategory: true,
                    companyId: true
                }
            });
            return { category }
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
    async getCategoryList(templateId: number) {
        try {
            let categories = await this.databaseService.category.findMany({
                where: {
                    questionnaireTemplateId: templateId,
                    isCompanyCategory: false,
                    isDeleted: false,

                },
            });
            return { categories }
        } catch (error) {
            console.log(error)
            throw new InternalServerErrorException();
        }
    }
    async getCategoryDetails(templateId: number, categoryId: number) {
        try {
            let category = await this.databaseService.category.findUniqueOrThrow({
                where: {
                    id: categoryId,
                    questionnaireTemplateId: templateId,
                    isCompanyCategory: false,
                    isDeleted: false,

                },
            });
            return { category }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.CATEGORY_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }
    async updateCategory(templateId: number, categoryId: number, body: UpdateCategoryDTO) {
        try {
            let category = await this.databaseService.category.findUniqueOrThrow({
                where: {
                    id: categoryId,
                    questionnaireTemplateId: templateId,
                    isCompanyCategory: false,
                    isDeleted: false,

                },
            });
            category = await this.databaseService.category.update({
                where: {
                    id: categoryId,
                    questionnaireTemplateId: templateId,
                    isCompanyCategory: false,
                    isDeleted: false,

                },
                data: {
                    name: body.name,
                    linkToPhase: body.linkToPhase,
                    linkToSelection: body.linkToSelection,
                }
            })
            return { category, message: ResponseMessages.CATEGORY_UPDATED }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.CATEGORY_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }
    async deleteCategory(templateId: number, categoryId: number) {
        try {
            let category = await this.databaseService.category.findUniqueOrThrow({
                where: {
                    id: categoryId,
                    questionnaireTemplateId: templateId,
                    isCompanyCategory: false,
                    isDeleted: false,

                },
            });
            await this.databaseService.$transaction([
                this.databaseService.category.update({
                    where: {
                        id: category.id,
                        questionnaireTemplateId: templateId,
                        isCompanyCategory: false,
                        isDeleted: false,
                    },
                    data: {
                        isDeleted: true
                    }
                }),
                this.databaseService.templateQuestion.updateMany({
                    where: {
                        questionnaireTemplateId: templateId,
                        categoryId: category.id,
                        isDeleted: false,
                    },
                    data: {
                        isDeleted: true
                    }
                })
            ]);

            return { message: ResponseMessages.CATEGORY_DELETED }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.CATEGORY_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }
    async changeCategoryOrder(templateId: number, categoryId: number, body: UpdateCategoryOrderDTO) {
        try {
            let template = await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                where: {
                    id: templateId,
                    isCompanyTemplate: false,
                    isDeleted: false,

                },
            });
            let category = await this.databaseService.category.findUniqueOrThrow({
                where: {
                    id: categoryId,
                    questionnaireTemplateId: templateId,
                    isCompanyCategory: false,
                    isDeleted: false,

                }
            });
            let result = await this.databaseService.$transaction([
                this.databaseService.category.updateMany({
                    where: {
                        questionnaireTemplateId: templateId,
                        isCompanyCategory: false,
                        isDeleted: false,
                        questionnaireOrder: {
                            gte: body.questionnaireOrder
                        },

                    },
                    data: {
                        questionnaireOrder: {
                            increment: 1,
                        }
                    }
                }),
                this.databaseService.category.update({
                    where: {
                        id: categoryId,
                        questionnaireTemplateId: templateId,
                        isCompanyCategory: false,
                        isDeleted: false,
                    },
                    data: {
                        questionnaireOrder: body.questionnaireOrder
                    }
                }),
                this.databaseService.questionnaireTemplate.findUniqueOrThrow({
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
                                questions: true
                            },
                            orderBy: {
                                questionnaireOrder: 'asc'
                            }
                        }
                    }
                })
            ])

            return { template: result[2], message: ResponseMessages.CATEGORY_ORDER_UPDATED }
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
