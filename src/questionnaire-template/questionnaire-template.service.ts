import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { CreateUpdateQuestionnaireTemplateDTO } from './validators/create-edit-questionnaire-template';
import { PrismaErrorCodes, ResponseMessages, UserTypes, TemplateType } from 'src/core/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class QuestionnaireTemplateService {

    constructor(private databaseService: DatabaseService) { }

    async createQuestionnaireTemplate(user: User, companyId: number, body: CreateUpdateQuestionnaireTemplateDTO) {
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

                let template = await this.databaseService.questionnaireTemplate.create({
                    data: {
                        name: body.name,
                        companyId: company.id,
                        isCompanyTemplate: true,
                        templateType: TemplateType.QUESTIONNAIRE
                    },
                    omit: {

                        isDeleted: true,
                        isCompanyTemplate: false
                    },
                    include: {
                        categories: {
                            where: {
                                isDeleted: false,
                                isCompanyCategory: false,
                            },
                            omit: {
                                isDeleted: true,
                                isCompanyCategory: false,
                                companyId: true
                            },
                            include: {
                                questions: {
                                    omit: {
                                        isDeleted: true,
                                        categoryId: true,
                                        questionnaireTemplateId: true
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
                return { template }

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.UNIQUE_EMAIL_ERROR);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            } else {
                throw new InternalServerErrorException();
            }
        }
    }

    async getQuestionnaireTemplateList(user: User, companyId: number) {

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

                let templates = await this.databaseService.questionnaireTemplate.findMany({
                    where: {
                        companyId,
                        isCompanyTemplate: true,
                        isDeleted: false,
                    },
                    omit: {

                        isDeleted: true,
                        isCompanyTemplate: false
                    },
                    include: {
                        categories: {
                            where: {
                                isDeleted: false,
                                isCompanyCategory: true,
                                linkToQuestionnaire: true,
                            },
                            omit: {
                                isDeleted: true,
                                isCompanyCategory: false,

                            },
                            include: {
                                questions: {
                                    where: {
                                        isDeleted: false,
                                        linkToQuestionnaire: true
                                    },
                                    omit: {
                                        isDeleted: true,

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
                return { templates }


            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.UNIQUE_EMAIL_ERROR);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            } else {
                throw new InternalServerErrorException();
            }
        }
    }

    async updateQuestionnaireTemplate(user: User, companyId: number, templateId: number, body: CreateUpdateQuestionnaireTemplateDTO) {
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

                let template = await this.databaseService.questionnaireTemplate.update({
                    where: {
                        companyId,
                        id: templateId,
                        isDeleted: false,
                        isCompanyTemplate: true,
                    },
                    data: {
                        name: body.name
                    },
                    omit: {

                        isDeleted: true,
                        isCompanyTemplate: false
                    },
                    include: {
                        categories: {
                            where: {
                                isDeleted: false,
                                isCompanyCategory: true,
                                linkToQuestionnaire: true,
                            },
                            omit: {
                                isDeleted: true,
                                isCompanyCategory: false,

                            },
                            include: {
                                questions: {
                                    where: {
                                        isDeleted: false,
                                        linkToQuestionnaire: true
                                    },
                                    omit: {
                                        isDeleted: true,

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
                return { template, message: ResponseMessages.QUESTIONNAIRE_TEMPLATE_UPDATED }

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.UNIQUE_EMAIL_ERROR);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            } else {
                throw new InternalServerErrorException();
            }
        }
    }

    async deleteQuestionnaireTemplate(user: User, companyId: number, templateId: number) {
        try {
            if (user.userType == UserTypes.BUILDER || user.userType === UserTypes.ADMIN) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isDeleted: false,
                        isCompanyTemplate: true,
                        companyId
                    }
                })

                // Update the template to set isDeleted to true
                await this.databaseService.$transaction([
                    this.databaseService.questionnaireTemplate.update({
                        where: {
                            id: templateId,
                        },
                        data: {
                            isDeleted: true
                        }
                    }),
                    this.databaseService.category.updateMany({
                        where: {
                            questionnaireTemplateId: templateId,
                            isDeleted: false,
                        },
                        data: {
                            isDeleted: true
                        },
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

                let template = await this.databaseService.questionnaireTemplate.findMany({
                    where: {
                        companyId,
                        isCompanyTemplate: true,
                        isDeleted: false,
                    },
                    omit: {

                        isDeleted: true,
                        isCompanyTemplate: false
                    },
                    include: {
                        categories: {
                            where: {
                                isDeleted: false,
                                isCompanyCategory: true,
                                linkToQuestionnaire: true,
                            },
                            omit: {
                                isDeleted: true,
                                isCompanyCategory: false,

                            },
                            include: {
                                questions: {
                                    where: {
                                        isDeleted: false,
                                        linkToQuestionnaire: true,
                                    },
                                    omit: {
                                        isDeleted: true,

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

                return { template, message: ResponseMessages.QUESTIONNAIRE_TEMPLATE_DELETED }

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.error(error);

            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR) {
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                }
                console.log(error.code); // Log error code for debugging
            } else if (error instanceof ForbiddenException) {
                throw error;
            } else {
                throw new InternalServerErrorException();
            }
        }
    }

}
