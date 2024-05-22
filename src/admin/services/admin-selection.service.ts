import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, TemplateType } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class AdminSelectionService {
    constructor(private readonly databaseService: DatabaseService) {

    }

    async getInitialSelection() {
        try {
            let template = await this.databaseService.questionnaireTemplate.findFirst({
                where: {
                    templateType: TemplateType.SELECTION_INITIAL,
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
                            linkToInitalSelection: true,
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
                                where: {
                                    isDeleted: false
                                },
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
            if (template) {
                return { data: template }
            } else {
                let initalSelection = await this.databaseService.questionnaireTemplate.create({
                    data: {
                        name: 'Selection - Initial',
                        isCompanyTemplate: false,
                        templateType: TemplateType.SELECTION_INITIAL
                    },
                    omit: {
                        companyId: true,
                        isDeleted: true,
                        isCompanyTemplate: true
                    },
                    include: {
                        categories: {
                            where: {
                                linkToInitalSelection: true,
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
                return { data: initalSelection }
            }

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
    async getPaintSelection() {
        try {
            let template = await this.databaseService.questionnaireTemplate.findFirst({
                where: {
                    templateType: TemplateType.SELECTION_PAINT,
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
                            linkToInitalSelection: true,
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
                                where: {
                                    isDeleted: false
                                },
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
            if (template) {
                return { data: template }
            } else {
                let paintSelection = await this.databaseService.questionnaireTemplate.create({
                    data: {
                        name: 'Selection - Paint',
                        isCompanyTemplate: false,
                        templateType: TemplateType.SELECTION_PAINT
                    },
                    omit: {
                        companyId: true,
                        isDeleted: true,
                        isCompanyTemplate: true
                    },
                    include: {
                        categories: {
                            where: {
                                linkToInitalSelection: true,
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
                return { data: paintSelection }
            }

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
