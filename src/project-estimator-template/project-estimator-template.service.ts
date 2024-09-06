import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { ProjectEstimatorTemplateNameDTO } from './validators/templateName';
import { ProjectEstimatorTemplateHeaderDTO } from './validators/header';
import { ProjectEstimatorTemplateDTO } from './validators/add-project-estimator-template';
import { ProjectEstimatorAccountingTemplateDTO } from './validators/add-project-estimator-accounting';
import { BulkUpdateProjectEstimatorTemplateDTO } from './validators/pet-bulk-update';


@Injectable()
export class ProjectEstimatorTemplateService {
    constructor(private databaseService: DatabaseService) { }

    // create project estimator template name.
    async addProjectEstimatorTemplateName(user: User, body: ProjectEstimatorTemplateNameDTO,) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== user.companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let projectEstimatorTemplate = await this.databaseService.projectEstimatorTemplate.create({
                    data: {
                        templateName: body.name,
                        companyId: user.companyId
                    }
                })

                return { projectEstimatorTemplate }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== user.companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let tempData = await this.databaseService.projectEstimatorTemplate.findMany({
                    where: {
                        companyId: user.companyId
                    }
                })

                return { tempData }
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

                let projectEstimatorHeader = await this.databaseService.projectEstimatorTemplateHeader.create({
                    data: {
                        companyId,
                        name: body.name,
                        petId: body.projectEstimatorTemplateId
                    }
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
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
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
                        createdAt: 'asc'
                    },
                    include: {
                        ProjectEstimatorTemplateData: {
                            where: {
                                isDeleted: false,
                            }
                        }
                    }
                });
                console.log(templateData)
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

    // create project estimator template data
    async createTemplateData(user: User, companyId: number, templateId: number, body: ProjectEstimatorTemplateDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let projectEstimator = await this.databaseService.projectEstimatorTemplateData.create({
                    data: {
                        ...body,

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

    // update template data
    async updateTemplateData(user: User, estimatorId: number, body: ProjectEstimatorTemplateDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== user.companyId) {
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
    async deleteHeader(user: User, templateId: number, headerId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== user.companyId) {
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

                // Delete header
                await this.databaseService.projectEstimatorTemplateHeader.update({
                    where: {
                        id: headerId
                    },
                    data: {
                        isDeleted: true
                    }
                });

                // Delete related project estimator data
                await this.databaseService.projectEstimatorTemplateData.updateMany({
                    where: {
                        petHeaderId: headerId
                    },
                    data: {
                        isDeleted: true
                    }
                })
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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== user.companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Check if the project estimator exist.
                await this.databaseService.projectEstimatorTemplateData.findFirstOrThrow({
                    where: {
                        id: estimatorId,
                        isDeleted: false
                    }
                })

                await this.databaseService.projectEstimatorTemplateData.update({
                    where: {
                        id: estimatorId,
                        isDeleted: false,
                    },
                    data: {
                        isDeleted: true
                    }
                })

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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== user.companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

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

                const { headerName, ...projectEstimatorData } = body;

                // insert new row for accounting
                let projectEstimator = await this.databaseService.projectEstimatorTemplateData.create({
                    data: {
                        petHeader: {
                            connect: {
                                id: accountingHeader.id
                            }
                        },
                        ...projectEstimatorData
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

    // edit the project estimator template headers
    async editHeader(user: User, templateId: number, headerId: number, body: ProjectEstimatorTemplateHeaderDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== user.companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // check new header is named as 'Change Orders'
                if (body.name.toLowerCase().replace(/\s/g, '') === "changeorders") {
                    throw new ConflictException("Change Orders header already exist")
                }

                await this.databaseService.projectEstimatorTemplateHeader.findFirstOrThrow({
                    where: {
                        id: headerId,
                        companyId: user.companyId,
                        petId: templateId,
                        isDeleted: false
                    }
                });

                let projectEstimatorHeader = await this.databaseService.projectEstimatorTemplateHeader.update({
                    where: {
                        id: headerId,
                        petId: templateId
                    },
                    data: {
                        name: body.name
                    }
                });
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

    // bulk update data
    async projectEstimatorBulkUpdate(user: User, templateId: number, body: BulkUpdateProjectEstimatorTemplateDTO[]) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== user.companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Ensure body is defined and not empty
                if (!body || !Array.isArray(body) || body.length === 0) {
                    return { message: 'No data provided for bulk update' };
                }


                console.log(body)
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
}
