import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { CreateUpdateQuestionnaireTemplateDTO } from './validators/create-edit-questionnaire-template';
import { PrismaErrorCodes, ResponseMessages, UserTypes, TemplateType, toSnakeCase } from 'src/core/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { bufferToStream } from 'src/core/utils/files';
import * as csv from 'csv-parse';
import { QuestionnaireImportService } from './questionnaire-import/questionnaire-import.service'
import { CSVValidator, CSV_COLUMN_DEFINITIONS } from 'src/core/services/csv.validator';
@Injectable()
export class QuestionnaireTemplateService {

    constructor(private databaseService: DatabaseService,
        private questionnaireImportService: QuestionnaireImportService
    ) { }

    async createQuestionnaireTemplate(user: User, companyId: number, body: CreateUpdateQuestionnaireTemplateDTO) {
        try {
            // Check if User is Admin of the Company.

            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const createResponse = await this.databaseService.$transaction(async (tx) => {
                    const projectEstimatorTemplate = await tx.projectEstimatorTemplate.create({
                        data: {
                            templateName: body.name,
                            companyId
                        }
                    });

                    const calendarTemplate = await tx.calendarTemplate.create({
                        data: { name: body.name, companyId, isCompanyTemplate: true }
                    });
                    const questionnaireTemplate = await tx.questionnaireTemplate.create({
                        data: {
                            name: body.name,
                            companyId: company.id,
                            isCompanyTemplate: true,
                            templateType: TemplateType.QUESTIONNAIRE,
                            projectEstimatorTemplateId: projectEstimatorTemplate.id,
                            calendarTemplateId: calendarTemplate.id
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
                                    linkToQuestionnaire: true,
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
                                            questionnaireTemplateId: true,
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
                            }
                        }
                    });

                    return { projectEstimatorTemplate, questionnaireTemplate }
                });

                return { template: createResponse?.questionnaireTemplate }
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
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
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
            if (user.userType == UserTypes.ADMIN || ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId === companyId)) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let updateResponse = await this.databaseService.$transaction(async (tx) => {
                    const questionnaireTemplate = await tx.questionnaireTemplate.update({
                        where: {
                            id: templateId,
                            companyId,
                            isDeleted: false,
                            isCompanyTemplate: true,
                        },
                        data: {
                            name: body.name,
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

                    if (questionnaireTemplate.calendarTemplateId) {
                        await tx.calendarTemplate.update({
                            where: { id: questionnaireTemplate.calendarTemplateId },
                            data: { name: body.name }
                        })
                    }

                    if (questionnaireTemplate.projectEstimatorTemplateId) {
                        const projectEstimator = await tx.projectEstimatorTemplate.update({
                            where: {
                                id: questionnaireTemplate.projectEstimatorTemplateId
                            },
                            data: {
                                templateName: body.name
                            }
                        });

                        return { questionnaireTemplate, projectEstimator }
                    }

                    return { questionnaireTemplate }

                });
                return { template: updateResponse.questionnaireTemplate, message: ResponseMessages.QUESTIONNAIRE_TEMPLATE_UPDATED }

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
            if (user.userType == UserTypes.BUILDER || user.userType === UserTypes.ADMIN || user.userType == UserTypes.EMPLOYEE) {
                if ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const tempToDelete = await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isDeleted: false,
                        isCompanyTemplate: true,
                        companyId
                    }
                })

                await this.databaseService.$transaction(async (tx) => {
                    if (tempToDelete.projectEstimatorTemplateId) {
                        await tx.projectEstimatorTemplate.update({
                            where: { id: tempToDelete.projectEstimatorTemplateId },
                            data: { isDeleted: true }
                        });

                        const deleteHeaders = await tx.projectEstimatorTemplateHeader.findMany({
                            where: { petId: tempToDelete.projectEstimatorTemplateId },
                            select: { id: true }
                        });

                        const deleteHeaderIds = deleteHeaders.map(header => header.id);
                        if (deleteHeaderIds.length > 0) {
                            const deleteData = await tx.projectEstimatorTemplateData.updateMany({
                                where: {
                                    petHeaderId: { in: deleteHeaderIds },
                                    isDeleted: false,
                                },
                                data: { isDeleted: true, order: 0 }
                            })

                            const deleteHeaders = await tx.projectEstimatorTemplateHeader.updateMany({
                                where: {
                                    id: { in: deleteHeaderIds },
                                    petId: tempToDelete.projectEstimatorTemplateId,
                                    isDeleted: false,
                                    companyId
                                },
                                data: { isDeleted: true, headerOrder: 0 }
                            })
                        }
                    }

                    if (tempToDelete.calendarTemplateId) {
                        const clTemplate = await tx.calendarTemplate.update({
                            where: { id: tempToDelete.calendarTemplateId },
                            data: { isDeleted: true }
                        })

                        await tx.calendarTemplateData.updateMany({
                            where: { ctId: clTemplate.id },
                            data: { isDeleted: true }
                        })
                    }

                    await tx.questionnaireTemplate.update({
                        where: { id: templateId },
                        data: { isDeleted: true }
                    });

                    await tx.category.updateMany({
                        where: { questionnaireTemplateId: templateId, isDeleted: false },
                        data: { isDeleted: true, questionnaireOrder: 0, initialOrder: 0, paintOrder: 0 }
                    });

                    await tx.templateQuestion.updateMany({
                        where: { questionnaireTemplateId: templateId, isDeleted: false, },
                        data: { isDeleted: true, questionOrder: 0, initialQuestionOrder: 0, paintQuestionOrder: 0 }
                    })
                })

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

    async importTemplate(user: User, file: Express.Multer.File, companyId: number, body: { templateId: string }) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let company = await this.databaseService.company.findUniqueOrThrow({
                    where: {
                        id: companyId,
                        isDeleted: false,
                    }
                });

                if (!company) throw new ForbiddenException("Action Not Allowed");
                const csvContent = file.buffer
                const parsedData: any = await new Promise((resolve, reject) => {
                    csv.parse(csvContent, { columns: true, relax_quotes: true, skip_empty_lines: true, cast: true }, (err, records) => {
                        if (err) {
                            reject(err);
                            return { error: true, message: "Unable to parse file" }
                        }
                        const snakeCaseRecords = records.map(record => {
                            const newRecord = {};
                            Object.keys(record).forEach(key => {
                                // Convert the key to snake_case and assign the corresponding value
                                newRecord[toSnakeCase(key)] = record[key];
                            });
                            return newRecord;
                        });
                        resolve(snakeCaseRecords);
                    });
                });
                CSVValidator.validateColumnsOrThrow(parsedData, CSV_COLUMN_DEFINITIONS.QUESTIONNAIRE);
                if (!parsedData.length) throw new ForbiddenException('Could not read csv file. please check the format and retry.')
                let groupedData = await this.questionnaireImportService.groupContent(parsedData);
                if (!groupedData.length) throw new ForbiddenException('Could not read csv file. please check the format and retry.')

                const template = await this.questionnaireImportService.checkTemplateExist('questionnaire', body, companyId);
                const templateId = template.id;

                await this.databaseService.$transaction(async (tx) => {
                    for (const element of groupedData) {
                        await this.questionnaireImportService.processImport(tx, element, templateId, companyId);
                    }
                });

                let newTemplate = await this.databaseService.questionnaireTemplate.findMany({
                    where: {
                        companyId,
                        isDeleted: false,
                        isCompanyTemplate: true,
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
                })

                return { template: newTemplate, message: ResponseMessages.TEMPLATE_IMPORTED_SUCCESSFULLY }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            if (error instanceof BadRequestException) {                
                throw error; // Re-throw to send to client
            }
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }

            throw new InternalServerErrorException();
        }
    }

}
