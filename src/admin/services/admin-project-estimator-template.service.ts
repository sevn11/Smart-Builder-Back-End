import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import * as csv from 'csv-parse';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, TemplateType, UserTypes, toSnakeCase } from 'src/core/utils';
import { ProjectEstimatorTemplateNameDTO } from '../validators/project-estimator/templateName';
import { ProjectEstimatorTemplateHeaderDTO } from '../validators/project-estimator/header';
import { ProjectEstimatorTemplateDTO } from '../validators/project-estimator/add-project-estimator-template';
import { ProjectEstimatorAccountingTemplateDTO } from '../validators/project-estimator/add-project-estimator-accounting';
import { BulkUpdateProjectEstimatorTemplateDTO } from '../validators/project-estimator/pet-bulk-update';
import { marginCalculation, markupCalculation, ProfitCalculationTypeEnum } from 'src/core/utils/profit-calculation';
import { ProfitCalculationType } from 'src/core/utils/company';
import { ItemOrderDTO } from '../validators/project-estimator/item-order';
import { ImportEstimatorTemplateService } from './import-template/import-estimator-template.service';

@Injectable()
export class AdminProjectEstimatorTemplateService {
    constructor(
        private databaseService: DatabaseService,
        private importEstimatorTemplateService: ImportEstimatorTemplateService
    ) { }

    // create project estimator template name.
    async addProjectEstimatorTemplateName(user: User, body: ProjectEstimatorTemplateNameDTO,) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {

                const company = await this.databaseService.company.findUniqueOrThrow({
                    where: { id: user.companyId, isDeleted: false }
                });

                let projectEstimator = await this.databaseService.$transaction(async (tx) => {
                    const projectEstTemplate = await tx.masterProjectEstimatorTemplate.create({
                        data: {
                            templateName: body.name,
                            profitCalculationType: company.profitCalculationType || ProfitCalculationType.MARGIN
                        }
                    });

                    const questTemplate = await tx.masterQuestionnaireTemplate.create({
                        data: {
                            name: body.name,
                            templateType: TemplateType.PROJECT_ESTIMATOR,
                            masterProjectEstimatorTemplateId: projectEstTemplate.id
                        }
                    })
                    return { projectEstTemplate, questTemplate }
                })

                return projectEstimator?.projectEstTemplate
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // edit the project estimator template
    async updateProjectEstimatorTemplate(user: User, templateId: number, body: ProjectEstimatorTemplateNameDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {

                let template = await this.databaseService.masterProjectEstimatorTemplate.findUnique({
                    where: {
                        id: templateId,
                        isDeleted: false,
                    }
                })
                if (!template) {
                    throw new ForbiddenException('An error occurred with the template.')
                }

                const updateTemplate = await this.databaseService.$transaction(async (tx) => {
                    const projectEstimator = await tx.masterProjectEstimatorTemplate.update({
                        where: {
                            id: templateId,
                            isDeleted: false,
                        },
                        data: {
                            templateName: body.name
                        }
                    });
                    const masterQuestionnaireTemplate = await tx.masterQuestionnaireTemplate.findFirst({
                        where: {
                            masterProjectEstimatorTemplateId: templateId,
                            isDeleted: false,
                        },
                    });

                    if (masterQuestionnaireTemplate) {
                        const updateQuestionnaireTemplate = await tx.masterQuestionnaireTemplate.update({
                            where: {
                                id: masterQuestionnaireTemplate.id,
                            },
                            data: {
                                name: body.name
                            }
                        })

                        return { projectEstimator, updateQuestionnaireTemplate }
                    }
                    return { projectEstimator }
                });

                return { template: updateTemplate.projectEstimator, message: 'Template update successfully' }

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error)
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // delete project estimator template 
    async deleteProjectEstimatorTemplate(user: User, templateId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {
                let template = await this.databaseService.masterProjectEstimatorTemplate.findUnique({
                    where: {
                        id: templateId,
                        isDeleted: false
                    }
                })

                if (!template) {
                    return new ForbiddenException('Template not found');
                }
                const templateToDelete = template.id;

                await this.databaseService.$transaction(async (tx) => {
                    // deleting all selection and questionnaire template.
                    const masterQuestionnaireTemplate = await tx.masterQuestionnaireTemplate.findFirst({
                        where: { masterProjectEstimatorTemplateId: templateToDelete }
                    });

                    if (masterQuestionnaireTemplate) {
                        const masterQuestionnaireTemplateId = masterQuestionnaireTemplate.id
                        await tx.masterQuestionnaireTemplate.update({
                            where: { id: masterQuestionnaireTemplateId, },
                            data: { isDeleted: true, }
                        });

                        await tx.masterTemplateCategory.updateMany({
                            where: { masterQuestionnaireTemplateId: masterQuestionnaireTemplateId },
                            data: { isDeleted: true, }
                        })
                        await tx.masterTemplateQuestion.updateMany({
                            where: { masterQuestionnaireTemplateId: masterQuestionnaireTemplateId },
                            data: { isDeleted: true, }
                        })
                    }
                    // deleting all selection and questionnaire template ends here.

                    // get all the header data of the template.
                    const deleteHeaders = await tx.masterProjectEstimatorTemplateHeader.findMany({
                        where: {
                            mpetId: templateToDelete, // The field you're using for filtering
                            isDeleted: false,
                        },
                        select: {
                            id: true, // Replace 'id' with the actual field name for your header ID
                        },
                    });
                    // delete header ids
                    const deletedHeaderIds = deleteHeaders.map(header => header.id);

                    if (deletedHeaderIds.length > 0) {
                        // delete all the template data.
                        await tx.masterProjectEstimatorTemplateData.updateMany({
                            where: {
                                mpetHeaderId: {
                                    in: deletedHeaderIds
                                },
                                isDeleted: false,
                            },
                            data: {
                                isDeleted: true,
                                order: 0
                            }
                        });

                        // delete all the headers.
                        await tx.masterProjectEstimatorTemplateHeader.updateMany({
                            where: {
                                id: {
                                    in: deletedHeaderIds,
                                },
                                mpetId: templateToDelete,
                                isDeleted: false
                            },
                            data: {
                                isDeleted: true,
                                headerOrder: 0
                            }
                        });
                    }

                    // delete the template
                    await tx.masterProjectEstimatorTemplate.update({
                        where: {
                            id: templateToDelete,
                            isDeleted: false,
                        },
                        data: {
                            isDeleted: true
                        }
                    })
                })
                return { message: ResponseMessages.TEMPLATE_DELETED_SUCCESSFULLY };
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // retrieve the project template names
    async getProjectEstimatorTemplateName(user: User) {
        try {
            if (user.userType == UserTypes.ADMIN) {

                let tempData = await this.databaseService.masterProjectEstimatorTemplate.findMany({
                    where: {
                        isDeleted: false,
                    }
                })

                return { tempData }
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // create headers for template
    async createHeader(user: User, body: ProjectEstimatorTemplateHeaderDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {
                // check new header is named as 'Change Orders'
                if (body.name.toLowerCase().replace(/\s/g, '') === "changeorders") {
                    throw new ConflictException("Change Orders header already exist")
                }

                let maxOrder = await this.databaseService.masterProjectEstimatorTemplateHeader.aggregate({
                    _max: {
                        headerOrder: true,
                    },
                    where: {
                        isDeleted: false,
                        mpetId: body.projectEstimatorTemplateId
                    }
                })
                // If body.headerOrder is 0, set it to maxOrder + 1
                let order =
                    body.headerOrder === 0
                        ? (maxOrder?._max.headerOrder ?? 0) + 1
                        : body.headerOrder;

                let projectEstimatorHeader = await this.databaseService.masterProjectEstimatorTemplateHeader.create({
                    data: {
                        name: body.name,
                        mpetId: body.projectEstimatorTemplateId,
                        headerOrder: order
                    },
                })

                return { projectEstimatorHeader }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // fetch the headers of a template
    async getTemplateData(user: User, templateId: number) {
        try {
            if (user.userType == UserTypes.ADMIN) {

                let templateData = await this.databaseService.masterProjectEstimatorTemplateHeader.findMany({
                    where: {
                        isDeleted: false,
                        mpetId: templateId
                    },
                    orderBy: {
                        headerOrder: 'asc'
                    },
                    include: {
                        MasterProjectEstimatorTemplateData: {
                            where: {
                                isDeleted: false,
                            },
                            orderBy: {
                                order: 'asc'
                            }
                        }
                    }
                });

                templateData = templateData.filter(header => header.name !== 'Statements');

                const projectEstimatorTempData = templateData.map(item => {
                    const { createdAt, updatedAt, ...rest } = item;
                    return {
                        ...rest,
                        ProjectEstimatorTemplateData: item.MasterProjectEstimatorTemplateData.map(estimator => ({
                            ...estimator,
                            unitCost: Number(estimator.unitCost).toFixed(2),
                            actualCost: Number(estimator.actualCost).toFixed(2),
                            grossProfit: Number(estimator.grossProfit).toFixed(2),
                            contractPrice: Number(estimator.contractPrice).toFixed(2),
                        }))
                    };
                });

                return { projectEstimatorTempData }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // create project estimator template data
    async createTemplateData(user: User, templateId: number, body: ProjectEstimatorTemplateDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {
                let maxOrder = await this.databaseService.masterProjectEstimatorTemplateData.aggregate({
                    _max: {
                        order: true
                    },
                    where: {
                        mpetHeaderId: body.mpetHeaderId,
                        isDeleted: false,
                    }
                })

                let order =
                    (maxOrder._max.order ?? 0) + 1;

                let projectEstimator = await this.databaseService.masterProjectEstimatorTemplateData.create({
                    data: {
                        ...body,
                        order: order,
                    }
                });
                return { projectEstimator }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // update template data
    async updateTemplateData(user: User, estimatorId: number, body: ProjectEstimatorTemplateDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {

                await this.databaseService.masterProjectEstimatorTemplateData.findFirstOrThrow({
                    where: {
                        id: estimatorId,
                        isDeleted: false,
                    }
                })

                let projectEstimator = await this.databaseService.masterProjectEstimatorTemplateData.update({
                    where: {
                        id: estimatorId,
                        isDeleted: false,
                    },
                    data: {
                        ...body
                    }
                })

                return { projectEstimator }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // delete the headers
    async deleteHeader(user: User, templateId: number, headerId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {

                // check if header exist or not
                let header = await this.databaseService.masterProjectEstimatorTemplateHeader.findFirstOrThrow({
                    where: {
                        id: headerId,
                        mpetId: templateId,
                        isDeleted: false
                    }
                })

                // restrict Change Orders header delete
                if (header.name.toLowerCase().replace(/\s/g, '') === "changeorders") {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const headerToDelete = await this.databaseService.masterProjectEstimatorTemplateHeader.findUniqueOrThrow({
                    where: {
                        id: headerId,
                        isDeleted: false,
                    },
                })

                const delHeaderOrder = headerToDelete.headerOrder;
                const delHeaderId = headerToDelete.id
                await this.databaseService.$transaction([
                    this.databaseService.masterProjectEstimatorTemplateHeader.update({
                        where: {
                            id: headerId,
                            mpetId: templateId,
                            isDeleted: false,
                        },
                        data: {
                            isDeleted: true,
                            headerOrder: 0
                        }
                    }),
                    this.databaseService.masterProjectEstimatorTemplateData.updateMany({
                        where: {
                            mpetHeaderId: delHeaderId,
                            isDeleted: false,
                        },
                        data: {
                            isDeleted: true,
                        }
                    }),
                    this.databaseService.masterProjectEstimatorTemplateHeader.updateMany({
                        where: {
                            mpetId: templateId,
                            isDeleted: false,
                            headerOrder: {
                                gt: delHeaderOrder
                            }
                        },
                        data: {
                            headerOrder: {
                                decrement: 1,
                            }
                        }
                    })
                ]);
                return { mesage: ResponseMessages.SUCCESSFUL }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    async deleteProjectEstimator(user: User, templateId: number, estimatorId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {

                const prEstToDelete = await this.databaseService.masterProjectEstimatorTemplateData.findUniqueOrThrow({
                    where: {
                        id: estimatorId,
                    }
                })

                const deleteOrder = prEstToDelete.order

                await this.databaseService.$transaction([
                    this.databaseService.masterProjectEstimatorTemplateData.update({
                        where: {
                            id: estimatorId,
                            isDeleted: false,
                        },
                        data: {
                            isDeleted: true,
                            order: 0
                        }
                    }),
                    this.databaseService.masterProjectEstimatorTemplateData.updateMany({
                        where: {
                            mpetHeaderId: prEstToDelete.mpetHeaderId,
                            isDeleted: false,
                            order: {
                                gt: deleteOrder
                            }
                        },
                        data: {
                            order: {
                                decrement: 1,
                            }
                        }
                    })
                ])

                return { message: ResponseMessages.SUCCESSFUL }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error: any) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    async createProjectEstimatorAccount(user: User, templateId: number, body: ProjectEstimatorAccountingTemplateDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN) {

                await this.databaseService.masterProjectEstimatorTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isDeleted: false,
                    }
                });

                // Check if change order header exist or not. If not create one
                let accountingHeader = await this.databaseService.masterProjectEstimatorTemplateHeader.findFirst({
                    where: {
                        name: body.headerName,
                        mpetId: templateId,
                        isDeleted: false,
                    }
                })

                if (!accountingHeader) {
                    let createHeader = await this.databaseService.masterProjectEstimatorTemplateHeader.create({
                        data: {
                            mpetId: templateId,
                            name: body.headerName,

                        }
                    })

                    accountingHeader = createHeader;
                }

                let maxOrder = await this.databaseService.masterProjectEstimatorTemplateData.aggregate({
                    _max: {
                        order: true,
                    },
                    where: {
                        mpetHeaderId: accountingHeader.id,
                        isDeleted: false,
                    }
                });

                let order = (maxOrder?._max.order ?? 0) + 1;
                const { headerName, ...projectEstimatorData } = body;

                // insert new row for accounting
                let projectEstimator = await this.databaseService.masterProjectEstimatorTemplateData.create({
                    data: {
                        petHeader: {
                            connect: {
                                id: accountingHeader.id
                            }
                        },
                        ...projectEstimatorData,
                        order
                    }
                })

                return { projectEstimator }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // edit the project estimator template headers
    async editHeader(user: User, templateId: number, headerId: number, body: ProjectEstimatorTemplateHeaderDTO) {
        try {
            if (user.userType == UserTypes.ADMIN) {

                // check new header is named as 'Change Orders'
                if (body.name.toLowerCase().replace(/\s/g, '') === "changeorders") {
                    throw new ConflictException("Change Orders header already exist")
                }
                let totalHeaders = await this.databaseService.masterProjectEstimatorTemplateHeader.count({
                    where: {
                        mpetId: templateId,
                        isDeleted: false,
                    }
                })

                if (body.headerOrder > totalHeaders) {
                    throw new ForbiddenException(`Please enter a valid header order to sort.The order value should be min 1 to max ${totalHeaders}`);
                }

                let header = await this.databaseService.masterProjectEstimatorTemplateHeader.findFirstOrThrow({
                    where: {
                        id: headerId,
                        mpetId: templateId,
                        isDeleted: false
                    }
                });

                let currentOrder = header.headerOrder;


                if (currentOrder > body.headerOrder) {
                    await this.databaseService.$transaction([
                        this.databaseService.masterProjectEstimatorTemplateHeader.updateMany({
                            where: {
                                mpetId: templateId,
                                isDeleted: false,
                                headerOrder: {
                                    gte: body.headerOrder,
                                    lt: currentOrder,
                                }
                            },
                            data: {
                                headerOrder: {
                                    increment: 1,
                                }
                            }
                        }),
                        this.databaseService.masterProjectEstimatorTemplateHeader.update({
                            where: {
                                id: headerId,
                                mpetId: templateId,
                                isDeleted: false
                            },
                            data: {
                                headerOrder: body.headerOrder,
                                name: body.name
                            }
                        })
                    ])
                } else if (currentOrder < body.headerOrder) {
                    await this.databaseService.$transaction([
                        this.databaseService.masterProjectEstimatorTemplateHeader.updateMany({
                            where: {
                                mpetId: templateId,
                                isDeleted: false,
                                headerOrder: {
                                    gt: currentOrder,
                                    lte: body.headerOrder,
                                },
                            },
                            data: {
                                headerOrder: {
                                    decrement: 1,
                                }
                            }
                        }),
                        this.databaseService.masterProjectEstimatorTemplateHeader.update({
                            where: {
                                id: headerId,
                                mpetId: templateId,
                                isDeleted: false
                            },
                            data: {
                                headerOrder: body.headerOrder,
                                name: body.name
                            }
                        })
                    ])
                } else {
                    await this.databaseService.$transaction([
                        this.databaseService.masterProjectEstimatorTemplateHeader.update({
                            where: {
                                id: headerId,
                                mpetId: templateId,
                                isDeleted: false
                            },
                            data: {
                                headerOrder: body.headerOrder,
                                name: body.name
                            }
                        })
                    ])
                }

                header = await this.databaseService.masterProjectEstimatorTemplateHeader.findFirstOrThrow({
                    where: {
                        id: headerId,
                        mpetId: templateId,
                        isDeleted: false
                    },
                });
                return { header };
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // bulk update data
    async projectEstimatorBulkUpdate(user: User, templateId: number, body: BulkUpdateProjectEstimatorTemplateDTO[]) {
        try {
            if (user.userType == UserTypes.ADMIN) {

                // Ensure body is defined and not empty
                if (!body || !Array.isArray(body) || body.length === 0) {
                    return { message: 'No data provided for bulk update' };
                }


                const updatedData = [];
                for (const header of body) {
                    const updatedHeader = { ...header };
                    const updatedJobProjectEstimator = [];

                    for (const item of header.ProjectEstimatorTemplateData) {
                        const updatedItem = await this.databaseService.masterProjectEstimatorTemplateData.update({
                            where: { id: item.id },
                            data: {
                                grossProfit: item.grossProfit,
                                contractPrice: item.contractPrice,
                            },
                        });
                        updatedJobProjectEstimator.push(updatedItem);
                    }
                    updatedHeader.ProjectEstimatorTemplateData = updatedJobProjectEstimator;
                    updatedData.push(updatedHeader);
                }
                const formattedData = updatedData.map(header => ({
                    ...header,
                    ProjectEstimatorTemplateData: header.ProjectEstimatorTemplateData.map((estimator: { unitCost: string; actualCost: string; grossProfit: string; contractPrice: string; }) => ({
                        ...estimator,
                        unitCost: parseFloat(estimator.unitCost).toFixed(2),
                        actualCost: parseFloat(estimator.actualCost).toFixed(2),
                        grossProfit: parseFloat(estimator.grossProfit).toFixed(2),
                        contractPrice: parseFloat(estimator.contractPrice).toFixed(2)
                    }))
                }));
                return { formattedData }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // sort the order of items
    async reorderItem(user: User, templateId: number, body: ItemOrderDTO) {
        try {

            if (user.userType == UserTypes.ADMIN) {

                await this.databaseService.masterProjectEstimatorTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isDeleted: false
                    }
                })

                await this.databaseService.masterProjectEstimatorTemplateHeader.findUniqueOrThrow({
                    where: {
                        id: body.headerId,
                        mpetId: templateId,
                        isDeleted: false,
                    }
                })

                let prEstData = await this.databaseService.masterProjectEstimatorTemplateData.findUniqueOrThrow({
                    where: {
                        id: body.itemId,
                        mpetHeaderId: body.headerId,
                        isDeleted: false,
                    }
                })

                const currentOrder = prEstData.order;

                if (currentOrder > body.order) {
                    // Item is moving up.
                    await this.databaseService.$transaction([
                        this.databaseService.masterProjectEstimatorTemplateData.updateMany({
                            where: {
                                mpetHeaderId: body.headerId,
                                isDeleted: false,
                                order: {
                                    gte: body.order,
                                    lt: currentOrder
                                }
                            },
                            data: {
                                order: {
                                    increment: 1,
                                }
                            }
                        }),
                        this.databaseService.masterProjectEstimatorTemplateData.update({
                            where: {
                                id: body.itemId,
                                mpetHeaderId: body.headerId,
                                isDeleted: false,
                            },
                            data: {
                                order: body.order
                            }
                        })
                    ])

                    return { message: ResponseMessages.ITEM_ORDER_UPDATED, }
                } else if (currentOrder < body.order) {
                    // Item is moving down.
                    await this.databaseService.$transaction([
                        this.databaseService.masterProjectEstimatorTemplateData.updateMany({
                            where: {
                                mpetHeaderId: body.headerId,
                                isDeleted: false,
                                order: {
                                    gt: currentOrder,
                                    lte: body.order
                                }
                            },
                            data: {
                                order: {
                                    decrement: 1
                                }
                            }
                        }),
                        this.databaseService.masterProjectEstimatorTemplateData.update({
                            where: {
                                id: body.itemId,
                                mpetHeaderId: body.headerId,
                                isDeleted: false
                            },
                            data: {
                                order: body.order
                            }
                        }),
                    ]);

                    return { message: ResponseMessages.ITEM_ORDER_UPDATED, }
                }


            } else {
                throw new ForbiddenException("Action Not Allowed");
            }


        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    async importTemplate(user: User, file: Express.Multer.File, body: { templateId: string }) {
        try {
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
                                newRecord[toSnakeCase(key)] = record[key];
                            });
                            return newRecord;
                        })

                        resolve(snakeCaseRecords);
                    });
                });

                if (!parsedData.length) throw new ForbiddenException('Could not read csv file. please check the format and retry.')
                // group the content wrt the header name.
                let groupedData = await this.importEstimatorTemplateService.groupContent(parsedData);
                if (!groupedData.length) throw new ForbiddenException('Could not read csv file. please check the format and retry.')
                const template = await this.importEstimatorTemplateService.checkTemplateExist('project-estimator', body);

                if (!template || !template.id) throw new ForbiddenException('Unable to create template.')
                const templateId = template.id;

                groupedData.forEach(async (element: any) => {
                    this.importEstimatorTemplateService.processImport(element, templateId, user);
                });

                return { message: ResponseMessages.TEMPLATE_IMPORTED_SUCCESSFULLY }

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

    async updateTemplateProfitCalculationType (user: User, templateId: number, body: { profitCalculationType: ProfitCalculationTypeEnum }) {
        try {
            if (user.userType == UserTypes.ADMIN) {

                const template = await this.databaseService.masterProjectEstimatorTemplate.findFirstOrThrow({
                    where: { id: templateId, isDeleted: false }
                });

                const updatedTemplate = await this.databaseService.masterProjectEstimatorTemplate.update({
                    where: { id: templateId, isDeleted: false },
                    data: { profitCalculationType: body.profitCalculationType }
                });

                if (body.profitCalculationType !== template.profitCalculationType) {
                    const headers = await this.databaseService.masterProjectEstimatorTemplateHeader.findMany({
                        where: { mpetId: template.id, isDeleted: false },
                        include: {
                            MasterProjectEstimatorTemplateData: {
                                where: { isDeleted: false }
                            }
                        }
                    });
                    // Loop through each header
                    for (const header of headers) {
                        const dataItems = header.MasterProjectEstimatorTemplateData;

                        // Loop through each data item
                        for (const data of dataItems) {
                            const unitCost = parseFloat(data.unitCost.toString());
                            const quantity = parseFloat(data.quantity.toString());
                            const grossProfit = parseFloat(data.grossProfit.toString());
                            
                            const contractPrice =
                                updatedTemplate.profitCalculationType === ProfitCalculationType.MARKUP
                                    ? markupCalculation(quantity * unitCost, grossProfit)
                                    : marginCalculation(quantity * unitCost, grossProfit);

                            // Update the data
                            await this.databaseService.masterProjectEstimatorTemplateData.update({
                                where: { id: data.id, isDeleted: false },
                                data: {
                                    contractPrice,
                                }
                            });
                        }
                    }
                }

                return { message: ResponseMessages.SUCCESSFUL }
               
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }
}
