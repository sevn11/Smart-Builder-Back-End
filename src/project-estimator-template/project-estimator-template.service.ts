import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, Res } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import * as csv from 'csv-parse';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, TemplateType, UserTypes, toSnakeCase } from 'src/core/utils';
import { ProjectEstimatorTemplateNameDTO } from './validators/templateName';
import { ProjectEstimatorTemplateHeaderDTO } from './validators/header';
import { ProjectEstimatorTemplateDTO } from './validators/add-project-estimator-template';
import { ProjectEstimatorAccountingTemplateDTO } from './validators/add-project-estimator-accounting';
import { BulkUpdateProjectEstimatorTemplateDTO } from './validators/pet-bulk-update';
import { ItemOrderDTO } from './validators/item-order';
import { ImportTemplateService } from './import-template/import-template.service';

@Injectable()
export class ProjectEstimatorTemplateService {
    constructor(
        private databaseService: DatabaseService,
        private importTemplateService: ImportTemplateService
    ) { }

    // create project estimator template name.
    async addProjectEstimatorTemplateName(user: User, companyId: number, body: ProjectEstimatorTemplateNameDTO,) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let projectEstimator = await this.databaseService.$transaction(async (tx) => {
                    const projectEstTemplate = await tx.projectEstimatorTemplate.create({
                        data: {
                            templateName: body.name,
                            companyId: user.companyId
                        }
                    });

                    const questTemplate = await tx.questionnaireTemplate.create({
                        data: {
                            name: body.name,
                            companyId,
                            isCompanyTemplate: true,
                            templateType: TemplateType.PROJECT_ESTIMATOR,
                            projectEstimatorTemplateId: projectEstTemplate.id
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
    async updateProjectEstimatorTemplate(user: User, companyId: number, templateId: number, body: ProjectEstimatorTemplateNameDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let template = await this.databaseService.projectEstimatorTemplate.findUnique({
                    where: {
                        id: templateId,
                        isDeleted: false,
                    }
                })
                if (!template) {
                    throw new ForbiddenException('An error occurred with the template.')
                }

                const updateTemplate = await this.databaseService.$transaction(async (tx) => {
                    const projectEstimator = await tx.projectEstimatorTemplate.update({
                        where: {
                            id: templateId,
                            isDeleted: false,
                        },
                        data: {
                            templateName: body.name
                        }
                    });
                    const questionnaireTemplate = await tx.questionnaireTemplate.findFirst({
                        where: {
                            projectEstimatorTemplateId: templateId,
                            isDeleted: false,
                        },
                    });
                    const updateQuestionnaireTemplate = await tx.questionnaireTemplate.update({
                        where: {
                            id: questionnaireTemplate.id,
                        },
                        data: {
                            name: body.name
                        }
                    })

                    return { projectEstimator, updateQuestionnaireTemplate }
                });

                return { template: updateTemplate.projectEstimator, message: 'Template update successfully' }

                // return { template, message: 'Template updated successfully.' }
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

    // delete project estimator template 
    async deleteProjectEstimatorTemplate(user: User, companyId: number, templateId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let template = await this.databaseService.projectEstimatorTemplate.findUnique({
                    where: {
                        id: templateId,
                        isDeleted: false
                    }
                })

                if (!template) {
                    return new ForbiddenException('Template not found');
                }
                const templateToDelete = template.id;

                const result = await this.databaseService.$transaction(async (tx) => {
                    // deleting all selection and questionnaire template.
                    const questionnaireTemplate = await tx.questionnaireTemplate.findFirst({
                        where: { projectEstimatorTemplateId: templateToDelete }
                    });

                    if (questionnaireTemplate) {
                        const questionnaireTemplateId = questionnaireTemplate.id
                        await tx.questionnaireTemplate.update({
                            where: { id: questionnaireTemplateId, },
                            data: { isDeleted: true, }
                        });

                        await tx.category.updateMany({
                            where: { questionnaireTemplateId: questionnaireTemplateId },
                            data: { isDeleted: true, }
                        })
                        await tx.templateQuestion.updateMany({
                            where: { questionnaireTemplateId: questionnaireTemplateId },
                            data: { isDeleted: true, }
                        })
                    }
                    // deleting all selection and questionnaire template ends here.

                    // get all the header data of the template.
                    const deleteHeaders = await tx.projectEstimatorTemplateHeader.findMany({
                        where: {
                            petId: templateToDelete, // The field you're using for filtering
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
                        const deletedData = await tx.projectEstimatorTemplateData.updateMany({
                            where: {
                                petHeaderId: {
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
                        const deletedHeaders = await tx.projectEstimatorTemplateHeader.updateMany({
                            where: {
                                id: {
                                    in: deletedHeaderIds,
                                },
                                petId: templateToDelete,
                                isDeleted: false,
                                companyId
                            },
                            data: {
                                isDeleted: true,
                                headerOrder: 0
                            }
                        });
                    }

                    // delete the template
                    const deleteTemplate = await tx.projectEstimatorTemplate.update({
                        where: {
                            id: templateToDelete,
                            isDeleted: false,
                            companyId
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
    async getProjectEstimatorTemplateName(user: User, companyId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let tempData = await this.databaseService.projectEstimatorTemplate.findMany({
                    where: {
                        companyId: user.companyId,
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
    async createHeader(user: User, companyId: number, body: ProjectEstimatorTemplateHeaderDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                // check new header is named as 'Change Orders'
                if (body.name.toLowerCase().replace(/\s/g, '') === "changeorders") {
                    throw new ConflictException("Change Orders header already exist")
                }

                let maxOrder = await this.databaseService.projectEstimatorTemplateHeader.aggregate({
                    _max: {
                        headerOrder: true,
                    },
                    where: {
                        isDeleted: false,
                        companyId,
                        petId: body.projectEstimatorTemplateId
                    }
                })
                // If body.headerOrder is 0, set it to maxOrder + 1
                let order =
                    body.headerOrder === 0
                        ? (maxOrder?._max.headerOrder ?? 0) + 1
                        : body.headerOrder;

                let projectEstimatorHeader = await this.databaseService.projectEstimatorTemplateHeader.create({
                    data: {
                        companyId,
                        name: body.name,
                        petId: body.projectEstimatorTemplateId,
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
    async getTemplateData(user: User, companyId: number, templateId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let templateData = await this.databaseService.projectEstimatorTemplateHeader.findMany({
                    where: {
                        companyId,
                        isDeleted: false,
                        petId: templateId
                    },
                    orderBy: {
                        headerOrder: 'asc'
                    },
                    include: {
                        ProjectEstimatorTemplateData: {
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
                        ProjectEstimatorTemplateData: item.ProjectEstimatorTemplateData.map(estimator => ({
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
    async createTemplateData(user: User, companyId: number, templateId: number, body: ProjectEstimatorTemplateDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let maxOrder = await this.databaseService.projectEstimatorTemplateData.aggregate({
                    _max: {
                        order: true
                    },
                    where: {
                        petHeaderId: body.petHeaderId,
                        isDeleted: false,
                    }
                })

                let order =
                    (maxOrder._max.order ?? 0) + 1;

                let projectEstimator = await this.databaseService.projectEstimatorTemplateData.create({
                    data: {
                        ...body,
                        order: order

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
    async updateTemplateData(user: User, companyId: number, estimatorId: number, body: ProjectEstimatorTemplateDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                await this.databaseService.projectEstimatorTemplateData.findFirstOrThrow({
                    where: {
                        id: estimatorId,
                        isDeleted: false,
                    }
                })

                let projectEstimator = await this.databaseService.projectEstimatorTemplateData.update({
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
    async deleteHeader(user: User, companyId: number, templateId: number, headerId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // check if header exist or not
                let header = await this.databaseService.projectEstimatorTemplateHeader.findFirstOrThrow({
                    where: {
                        id: headerId,
                        petId: templateId,
                        companyId: user.companyId,
                        isDeleted: false
                    }
                })

                // restrict Change Orders header delete
                if (header.name.toLowerCase().replace(/\s/g, '') === "changeorders") {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const headerToDelete = await this.databaseService.projectEstimatorTemplateHeader.findUniqueOrThrow({
                    where: {
                        id: headerId,
                        isDeleted: false,
                        companyId
                    },
                })

                const delHeaderOrder = headerToDelete.headerOrder;
                const delHeaderId = headerToDelete.id
                await this.databaseService.$transaction([
                    this.databaseService.projectEstimatorTemplateHeader.update({
                        where: {
                            id: headerId,
                            petId: templateId,
                            isDeleted: false,
                            companyId
                        },
                        data: {
                            isDeleted: true,
                            headerOrder: 0
                        }
                    }),
                    this.databaseService.projectEstimatorTemplateData.updateMany({
                        where: {
                            petHeaderId: delHeaderId,
                            isDeleted: false,
                        },
                        data: {
                            isDeleted: true,
                        }
                    }),
                    this.databaseService.projectEstimatorTemplateHeader.updateMany({
                        where: {
                            petId: templateId,
                            isDeleted: false,
                            companyId,
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

    async deleteProjectEstimator(user: User, companyId: number, templateId: number, estimatorId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const prEstToDelete = await this.databaseService.projectEstimatorTemplateData.findUniqueOrThrow({
                    where: {
                        id: estimatorId,
                    }
                })

                const deleteOrder = prEstToDelete.order

                let result = await this.databaseService.$transaction([
                    this.databaseService.projectEstimatorTemplateData.update({
                        where: {
                            id: estimatorId,
                            isDeleted: false,
                        },
                        data: {
                            isDeleted: true,
                            order: 0
                        }
                    }),
                    this.databaseService.projectEstimatorTemplateData.updateMany({
                        where: {
                            petHeaderId: prEstToDelete.petHeaderId,
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

    async createProjectEstimatorAccount(user: User, companyId: number, templateId: number, body: ProjectEstimatorAccountingTemplateDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let template = await this.databaseService.projectEstimatorTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isDeleted: false,
                    }
                });

                // Check if change order header exist or not. If not create one
                let accountingHeader = await this.databaseService.projectEstimatorTemplateHeader.findFirst({
                    where: {
                        companyId: user.companyId,
                        name: body.headerName,
                        petId: templateId,
                        isDeleted: false,
                    }
                })

                if (!accountingHeader) {
                    let createHeader = await this.databaseService.projectEstimatorTemplateHeader.create({
                        data: {
                            companyId: user.companyId,
                            petId: templateId,
                            name: body.headerName,

                        }
                    })

                    accountingHeader = createHeader;
                }

                let maxOrder = await this.databaseService.projectEstimatorTemplateData.aggregate({
                    _max: {
                        order: true,
                    },
                    where: {
                        petHeaderId: accountingHeader.id,
                        isDeleted: false,
                    }
                });

                let order = (maxOrder?._max.order ?? 0) + 1;
                const { headerName, ...projectEstimatorData } = body;

                // insert new row for accounting
                let projectEstimator = await this.databaseService.projectEstimatorTemplateData.create({
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
    async editHeader(user: User, companyId: number, templateId: number, headerId: number, body: ProjectEstimatorTemplateHeaderDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // check new header is named as 'Change Orders'
                if (body.name.toLowerCase().replace(/\s/g, '') === "changeorders") {
                    throw new ConflictException("Change Orders header already exist")
                }
                let totalHeaders = await this.databaseService.projectEstimatorTemplateHeader.count({
                    where: {
                        petId: templateId,
                        isDeleted: false,
                        companyId: user.companyId
                    }
                })

                if (body.headerOrder > totalHeaders) {
                    throw new ForbiddenException(`Please enter a valid header order to sort.The order value should be min 1 to max ${totalHeaders}`);
                }

                let header = await this.databaseService.projectEstimatorTemplateHeader.findFirstOrThrow({
                    where: {
                        id: headerId,
                        companyId: user.companyId,
                        petId: templateId,
                        isDeleted: false
                    }
                });

                let currentOrder = header.headerOrder;


                if (currentOrder > body.headerOrder) {
                    let result = await this.databaseService.$transaction([
                        this.databaseService.projectEstimatorTemplateHeader.updateMany({
                            where: {
                                petId: templateId,
                                isDeleted: false,
                                companyId: user.companyId,
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
                        this.databaseService.projectEstimatorTemplateHeader.update({
                            where: {
                                id: headerId,
                                companyId: user.companyId,
                                petId: templateId,
                                isDeleted: false
                            },
                            data: {
                                headerOrder: body.headerOrder,
                                name: body.name
                            }
                        })
                    ])
                } else if (currentOrder < body.headerOrder) {
                    let result = await this.databaseService.$transaction([
                        this.databaseService.projectEstimatorTemplateHeader.updateMany({
                            where: {
                                petId: templateId,
                                isDeleted: false,
                                companyId: user.companyId,
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
                        this.databaseService.projectEstimatorTemplateHeader.update({
                            where: {
                                id: headerId,
                                companyId: user.companyId,
                                petId: templateId,
                                isDeleted: false
                            },
                            data: {
                                headerOrder: body.headerOrder,
                                name: body.name
                            }
                        })
                    ])
                } else {
                    let result = await this.databaseService.$transaction([
                        this.databaseService.projectEstimatorTemplateHeader.update({
                            where: {
                                id: headerId,
                                companyId: user.companyId,
                                petId: templateId,
                                isDeleted: false
                            },
                            data: {
                                headerOrder: body.headerOrder,
                                name: body.name
                            }
                        })
                    ])
                }

                header = await this.databaseService.projectEstimatorTemplateHeader.findFirstOrThrow({
                    where: {
                        id: headerId,
                        companyId: user.companyId,
                        petId: templateId,
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
    async projectEstimatorBulkUpdate(user: User, companyId: number, templateId: number, body: BulkUpdateProjectEstimatorTemplateDTO[]) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Ensure body is defined and not empty
                if (!body || !Array.isArray(body) || body.length === 0) {
                    return { message: 'No data provided for bulk update' };
                }


                const updatedData = [];
                for (const header of body) {
                    const updatedHeader = { ...header };
                    const updatedJobProjectEstimator = [];

                    for (const item of header.ProjectEstimatorTemplateData) {
                        const updatedItem = await this.databaseService.projectEstimatorTemplateData.update({
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
    async reorderItem(user: User, templateId: number, companyId: number, body: ItemOrderDTO) {
        try {

            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                await this.databaseService.company.findUniqueOrThrow({
                    where: {
                        id: companyId,
                        isDeleted: false,
                    }
                })

                let template = await this.databaseService.projectEstimatorTemplate.findUniqueOrThrow({
                    where: {
                        id: templateId,
                        isDeleted: false
                    }
                })

                let header = await this.databaseService.projectEstimatorTemplateHeader.findUniqueOrThrow({
                    where: {
                        id: body.headerId,
                        petId: templateId,
                        isDeleted: false,
                    }
                })

                let prEstData = await this.databaseService.projectEstimatorTemplateData.findUniqueOrThrow({
                    where: {
                        id: body.itemId,
                        petHeaderId: body.headerId,
                        isDeleted: false,
                    }
                })

                const currentOrder = prEstData.order;

                if (currentOrder > body.order) {
                    // Item is moving up.
                    let result = await this.databaseService.$transaction([
                        this.databaseService.projectEstimatorTemplateData.updateMany({
                            where: {
                                petHeaderId: body.headerId,
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
                        this.databaseService.projectEstimatorTemplateData.update({
                            where: {
                                id: body.itemId,
                                petHeaderId: body.headerId,
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
                    let result = await this.databaseService.$transaction([
                        this.databaseService.projectEstimatorTemplateData.updateMany({
                            where: {
                                petHeaderId: body.headerId,
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
                        this.databaseService.projectEstimatorTemplateData.update({
                            where: {
                                id: body.itemId,
                                petHeaderId: body.headerId,
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

    async importTemplate(user: User, file: Express.Multer.File, body: { templatename: string }, companyId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let company = await this.databaseService.company.findUniqueOrThrow({
                    where: { id: companyId, isDeleted: false, }
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
                                newRecord[toSnakeCase(key)] = record[key];
                            });
                            return newRecord;
                        })

                        resolve(snakeCaseRecords);
                    });
                });

                if (!parsedData.length) throw new ForbiddenException('Could not read csv file. please check the format and retry.')
                // group the content wrt the header name.
                let groupedData = await this.importTemplateService.groupContent(parsedData);
                if (!groupedData.length) throw new ForbiddenException('Could not read csv file. please check the format and retry.')

                const template = await this.importTemplateService.createTemplate(body, companyId);
                if (!template || !template.id) throw new ForbiddenException('Unable to create template.')
                const templateId = template.id;
            
                groupedData.forEach(async (element: any) => {
                    this.importTemplateService.processImport(element, templateId, companyId);
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
}
