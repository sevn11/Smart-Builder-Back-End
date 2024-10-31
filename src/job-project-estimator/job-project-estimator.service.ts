import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { JobProjectEstimatorHeaderDTO } from './validators/add-header';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JobProjectEstimatorDTO } from './validators/add-project-estimator';
import { JobProjectEstimatorAccountingDTO } from './validators/add-project-estimator-accounting';
import { BulkUpdateProjectEstimatorDTO } from './validators/pe-bulk-update';
import { UpdateStatementDTO } from './validators/update-statement';

@Injectable()
export class JobProjectEstimatorService {

    constructor(private databaseService: DatabaseService) { }

    // get all headers and project estimator data
    async getProjectEstimatorData(user: User, companyId: number, jobId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let prData = await this.databaseService.jobProjectEstimatorHeader.findMany({
                    where: {
                        companyId,
                        jobId,
                        isDeleted: false
                    },
                    select: {
                        id: true,
                        name: true,
                        companyId: true,
                        jobId: true,
                        isDeleted: true,
                        JobProjectEstimator: {
                            where: {
                                isDeleted: false
                            },
                            select: {
                                id: true,
                                item: true,
                                description: true,
                                costType: true,
                                quantity: true,
                                unitCost: true,
                                actualCost: true,
                                grossProfit: true,
                                contractPrice: true,
                                invoiceId: true,
                                isLootCost: true,
                                isDeleted: true,
                                jobProjectEstimatorHeaderId: true,
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                });
                // Filter out headers named 'Statements'
                prData = prData.filter(header => header.name !== 'Statements');
                const projectEstimatorData = prData.map(item => ({
                    ...item,
                    JobProjectEstimator: item.JobProjectEstimator.map(estimator => ({
                        ...estimator,
                        unitCost: Number(estimator.unitCost).toFixed(2),
                        actualCost: Number(estimator.actualCost).toFixed(2),
                        grossProfit: Number(estimator.grossProfit).toFixed(2),
                        contractPrice: Number(estimator.contractPrice).toFixed(2),
                    }))
                }));

                return { projectEstimatorData }
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

    // create new header for project estimator
    async createHeader(user: User, companyId: number, jobId: number, body: JobProjectEstimatorHeaderDTO) {
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
                let job = await this.databaseService.job.findUnique({
                    where: { id: jobId }
                });

                let projectEstimatorHeader = await this.databaseService.jobProjectEstimatorHeader.create({
                    data: {
                        companyId,
                        jobId,
                        clientTemplateId: job.templateId,
                        name: body.name
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

    // edit project estimator header
    async editHeader(user: User, companyId: number, jobId: number, headerId: number, body: JobProjectEstimatorHeaderDTO) {
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

                // check non deleted header exist or not
                await this.databaseService.jobProjectEstimatorHeader.findFirstOrThrow({
                    where: {
                        id: headerId,
                        companyId,
                        jobId,
                        isDeleted: false
                    }
                });

                let projectEstimatorHeader = await this.databaseService.jobProjectEstimatorHeader.update({
                    where: { id: headerId },
                    data: {
                        name: body.name
                    }
                });

                return { projectEstimatorHeader };
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

    // delete project estimator data row of a header
    async deleteHeader(user: User, companyId: number, jobId: number, headerId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // check header exisit or not
                let header = await this.databaseService.jobProjectEstimatorHeader.findFirstOrThrow({
                    where: {
                        id: headerId,
                        companyId,
                        jobId,
                        isDeleted: false
                    }
                });

                // restrict Change Orders header delete
                if (header.name.toLowerCase().replace(/\s/g, '') === "changeorders") {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Delete header
                await this.databaseService.jobProjectEstimatorHeader.update({
                    where: { id: headerId },
                    data: { isDeleted: true }
                });

                // Delete related project estimator rows
                await this.databaseService.jobProjectEstimator.updateMany({
                    where: { jobProjectEstimatorHeaderId: headerId },
                    data: { isDeleted: true }
                });

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
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // create new project estimator data row for a header
    async createProjectEstimator(user: User, companyId: number, jobId: number, body: JobProjectEstimatorDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let projectEstimator = await this.databaseService.jobProjectEstimator.create({
                    data: {
                        ...body
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

    // update project estimator data row of a header
    async updateProjectEstimator(user: User, companyId: number, jobId: number, projectEstimatorId: number, body: JobProjectEstimatorDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                await this.databaseService.jobProjectEstimator.findFirstOrThrow({
                    where: {
                        id: projectEstimatorId,
                        isDeleted: false
                    }
                });

                let projectEstimator = await this.databaseService.jobProjectEstimator.update({
                    where: {
                        id: projectEstimatorId,
                        isDeleted: false
                    },
                    data: {
                        ...body
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

    // delete project estimator data row of a header
    async deleteProjectEstimator(user: User, companyId: number, jobId: number, projectEstimatorId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                await this.databaseService.jobProjectEstimator.findFirstOrThrow({
                    where: {
                        id: projectEstimatorId,
                        isDeleted: false
                    }
                });

                await this.databaseService.jobProjectEstimator.update({
                    where: {
                        id: projectEstimatorId,
                        isDeleted: false
                    },
                    data: {
                        isDeleted: true
                    }
                });

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
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // create new project estimator data row for Accounting section
    async createProjectEstimatorAccounting(user: User, companyId: number, jobId: number, body: JobProjectEstimatorAccountingDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let job = await this.databaseService.job.findUnique({
                    where: { id: jobId }
                });
                // check header already exist or not else create new one
                let accountingHeader = await this.databaseService.jobProjectEstimatorHeader.findFirst({
                    where: {
                        companyId,
                        jobId,
                        clientTemplateId: job.templateId,
                        name: body.headerName,
                        isDeleted: false,
                    }
                });

                if (!accountingHeader) {
                    let createdHeader = await this.databaseService.jobProjectEstimatorHeader.create({
                        data: {
                            companyId,
                            jobId,
                            clientTemplateId: job.templateId,
                            name: body.headerName
                        }
                    });
                    accountingHeader = createdHeader;
                }

                const { headerName, ...projectEstimatorData } = body;

                // insert new row for accounting
                let projectEstimator = await this.databaseService.jobProjectEstimator.create({
                    data: {
                        jobProjectEstimatorHeader: {
                            connect: { id: accountingHeader.id }
                        },
                        ...projectEstimatorData
                    }
                });
                // insert invoice id for change orders
                if (projectEstimator.item === 'Change Order') {
                    // check for existing invoice ids
                    let items = await this.databaseService.jobProjectEstimator.findMany({
                        where: {
                            jobProjectEstimatorHeaderId: accountingHeader.id,
                            item: 'Change Order',
                            id: { not: projectEstimator.id },
                            invoiceId: { not: null },
                        },
                        orderBy: {
                            invoiceId: 'desc',
                        },
                    });

                    if (items.length == 0) {
                        await this.databaseService.jobProjectEstimator.update({
                            where: {
                                id: projectEstimator.id,
                            },
                            data: {
                                invoiceId: 1100,
                            },
                        })
                    }
                    else {
                        let highestInvoiceId = items[0].invoiceId;
                        if (highestInvoiceId) {
                            await this.databaseService.jobProjectEstimator.update({
                                where: {
                                    id: projectEstimator.id,
                                },
                                data: {
                                    invoiceId: highestInvoiceId + 1,
                                },
                            });
                        }
                    }
                }

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

    // project estimator bulk update
    async projectEstimatorBulkUpdate(user: User, companyId: number, jobId: number, body: BulkUpdateProjectEstimatorDTO[]) {
        try {
            // Check if User is Admin of the Company.
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
                    for (const item of header.JobProjectEstimator) {
                        const updatedItem = await this.databaseService.jobProjectEstimator.update({
                            where: { id: item.id },
                            data: {
                                grossProfit: item.grossProfit,
                                contractPrice: item.contractPrice,
                            },
                        });
                        updatedJobProjectEstimator.push(updatedItem);
                    }

                    updatedHeader.JobProjectEstimator = updatedJobProjectEstimator;
                    updatedData.push(updatedHeader);
                }
                const formattedData = updatedData.map(header => ({
                    ...header,
                    JobProjectEstimator: header.JobProjectEstimator.map(estimator => ({
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
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // get all change orders
    async getAllChangeOrders(user: User, companyId: number, jobId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const changeOrders = await this.databaseService.jobProjectEstimator.findMany({
                    where: {
                        isDeleted: false,
                        jobProjectEstimatorHeader: {
                            name: "Change Orders",
                            companyId,
                            jobId,
                            isDeleted: false
                        },
                    },
                    select: {
                        id: true,
                        description: true,
                        contractPrice: true,
                        createdAt: true,
                        invoiceId: true
                    },
                });

                return { changeOrders }
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

    // get specific estimator data for account statement
    async getAllStatements(user: User, companyId: number, jobId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // statments types
                const statementTypes = ['allowance', 'credit', 'contract-price', 'construction-draw', 'customer-payment', 'disbursement', 'expense'];

                const statements = await this.databaseService.jobProjectEstimator.findMany({
                    where: {
                        OR: [
                            // Condition for "Change Orders" headers
                            {
                                jobProjectEstimatorHeader: {
                                    name: 'Change Orders',
                                    companyId,
                                    jobId,
                                    isDeleted: false,
                                },
                                isDeleted: false
                            },
                            // Condition for "Statements" headers with specific item types
                            {
                                jobProjectEstimatorHeader: {
                                    name: 'Statements',
                                    companyId,
                                    jobId,
                                    isDeleted: false
                                },
                                isDeleted: false,
                                item: {
                                    in: statementTypes
                                }
                            }
                        ]
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                });

                return { statements }
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

    // update statement row
    async updateStatement(user: User, companyId: number, jobId: number, id: number, body: UpdateStatementDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                await this.databaseService.jobProjectEstimator.findFirstOrThrow({
                    where: {
                        id: id,
                        isDeleted: false
                    }
                });

                const { headerName, ...bodyWithoutHeader } = body;

                let statement = await this.databaseService.jobProjectEstimator.update({
                    where: {
                        id: id,
                        isDeleted: false
                    },
                    data: {
                        ...bodyWithoutHeader
                    }
                });

                return { statement }

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

}
