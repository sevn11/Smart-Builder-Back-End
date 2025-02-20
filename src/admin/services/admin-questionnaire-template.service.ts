import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { CreateUpdateQuestionnaireTemplateDTO } from '../validators/questionnaire/create-edit-questionnaire-template';
import { PrismaErrorCodes, ResponseMessages, UserTypes, TemplateType, toSnakeCase } from 'src/core/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { bufferToStream } from 'src/core/utils/files';
import * as csv from 'csv-parse';
import { MasterQuestionnaireImportService } from './import-template/questionnaire-import.service';
@Injectable()
export class AdminQuestionnaireTemplateService {

    constructor(private databaseService: DatabaseService,
        private masterQuestionnaireImportService: MasterQuestionnaireImportService
    ) { }

    async createQuestionnaireTemplate(user: User, body: CreateUpdateQuestionnaireTemplateDTO) {
        try {
            // Check if User is Admin of the Company.

            if (user.userType == UserTypes.ADMIN) {

                const createResponse = await this.databaseService.$transaction(async (tx) => {
                    const projectEstimatorTemplate = await tx.masterProjectEstimatorTemplate.create({
                        data: {
                            templateName: body.name
                        }
                    });
                    const questionnaireTemplate = await tx.masterQuestionnaireTemplate.create({
                        data: {
                            name: body.name,
                            templateType: TemplateType.QUESTIONNAIRE,
                            masterProjectEstimatorTemplateId: projectEstimatorTemplate.id
                        },
                        omit: {
                            isDeleted: true,
                        },
                        include: {
                            masterTemplateCategories: {
                                where: {
                                    isDeleted: false,
                                    linkToQuestionnaire: true,
                                },
                                omit: {
                                    isDeleted: true,
                                },
                                include: {
                                    masterQuestions: {
                                        omit: {
                                            isDeleted: true,
                                            masterTemplateCategoryId: true,
                                            masterQuestionnaireTemplateId: true,
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

    async getQuestionnaireTemplateList(user: User) {

        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {

                let templates = await this.databaseService.masterQuestionnaireTemplate.findMany({
                    where: {
                        isDeleted: false,
                    },
                    omit: {

                        isDeleted: true,
                    },
                    include: {
                        masterTemplateCategories: {
                            where: {
                                isDeleted: false,
                                linkToQuestionnaire: true,
                            },
                            omit: {
                                isDeleted: true,

                            },
                            include: {
                                masterQuestions: {
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

    async updateQuestionnaireTemplate(user: User, templateId: number, body: CreateUpdateQuestionnaireTemplateDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {

                let updateResponse = await this.databaseService.$transaction(async (tx) => {

                    const masterQuestionnaireTemplate = await tx.masterQuestionnaireTemplate.update({
                        where: {
                            id: templateId,
                            isDeleted: false,
                        },
                        data: {
                            name: body.name,
                        },
                        omit: {

                            isDeleted: true,
                        },
                        include: {
                            masterTemplateCategories: {
                                where: {
                                    isDeleted: false,
                                    linkToQuestionnaire: true,
                                },
                                omit: {
                                    isDeleted: true,

                                },
                                include: {
                                    masterQuestions: {
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
                    if (masterQuestionnaireTemplate.masterProjectEstimatorTemplateId) {
                        const projectEstimator = await tx.projectEstimatorTemplate.update({
                            where: {
                                id: masterQuestionnaireTemplate.masterProjectEstimatorTemplateId
                            },
                            data: {
                                templateName: body.name
                            }
                        });

                        return { masterQuestionnaireTemplate, projectEstimator }
                    }

                    return { masterQuestionnaireTemplate }

                });
                return { template: updateResponse.masterQuestionnaireTemplate, message: ResponseMessages.QUESTIONNAIRE_TEMPLATE_UPDATED }

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

    async deleteQuestionnaireTemplate(user: User, templateId: number) {
        try {
            if (user.userType === UserTypes.ADMIN) {

                const tempToDelete = await this.databaseService.masterQuestionnaireTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isDeleted: false,
                    }
                })

                await this.databaseService.$transaction(async (tx) => {
                    if (tempToDelete.masterProjectEstimatorTemplateId) {
                        await tx.masterProjectEstimatorTemplate.update({
                            where: { id: tempToDelete.masterProjectEstimatorTemplateId },
                            data: { isDeleted: true }
                        });

                        const deleteHeaders = await tx.masterProjectEstimatorTemplateHeader.findMany({
                            where: { mpetId: tempToDelete.masterProjectEstimatorTemplateId },
                            select: { id: true }
                        });

                        const deleteHeaderIds = deleteHeaders.map(header => header.id);
                        if (deleteHeaderIds.length > 0) {
                            await tx.masterProjectEstimatorTemplateData.updateMany({
                                where: {
                                    mpetHeaderId: { in: deleteHeaderIds },
                                    isDeleted: false,
                                },
                                data: { isDeleted: true, order: 0 }
                            })

                            await tx.masterProjectEstimatorTemplateHeader.updateMany({
                                where: {
                                    id: { in: deleteHeaderIds },
                                    mpetId: tempToDelete.masterProjectEstimatorTemplateId,
                                    isDeleted: false,
                                },
                                data: { isDeleted: true, headerOrder: 0 }
                            })
                        }
                    }

                    await tx.masterQuestionnaireTemplate.update({
                        where: { id: templateId },
                        data: { isDeleted: true }
                    });

                    await tx.masterTemplateCategory.updateMany({
                        where: { masterQuestionnaireTemplateId: templateId, isDeleted: false },
                        data: { isDeleted: true, questionnaireOrder: 0, initialOrder: 0, paintOrder: 0 }
                    });

                    await tx.masterTemplateQuestion.updateMany({
                        where: { masterQuestionnaireTemplateId: templateId, isDeleted: false, },
                        data: { isDeleted: true, questionOrder: 0, initialQuestionOrder: 0, paintQuestionOrder: 0 }
                    })
                })

                let template = await this.databaseService.masterQuestionnaireTemplate.findMany({
                    where: {
                        isDeleted: false,
                    },
                    omit: {
                        isDeleted: true,
                    },
                    include: {
                        masterTemplateCategories: {
                            where: {
                                isDeleted: false,
                                linkToQuestionnaire: true,
                            },
                            omit: {
                                isDeleted: true,

                            },
                            include: {
                                masterQuestions: {
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

    async importTemplate(user: User, file: Express.Multer.File, body: { templateId: string }) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {
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

                if (!parsedData.length) throw new ForbiddenException('Could not read csv file. please check the format and retry.')
                let groupedData = await this.masterQuestionnaireImportService.groupContent(parsedData);
                if (!groupedData.length) throw new ForbiddenException('Could not read csv file. please check the format and retry.')

                const template = await this.masterQuestionnaireImportService.checkTemplateExist('questionnaire', body);
                const templateId = template.id;

                groupedData.forEach(async (element: any) => {
                    await this.masterQuestionnaireImportService.processImport(element, templateId)
                });

                let newTemplate = await this.databaseService.masterQuestionnaireTemplate.findMany({
                    where: {
                        isDeleted: false,
                    },
                    include: {
                        masterTemplateCategories: {
                            where: {
                                isDeleted: false,
                                linkToQuestionnaire: true,
                            },
                            omit: {
                                isDeleted: true,
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
                        }
                    }
                })

                return { template: newTemplate, message: ResponseMessages.TEMPLATE_IMPORTED_SUCCESSFULLY }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
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
