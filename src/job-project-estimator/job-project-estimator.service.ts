import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { JobProjectEstimatorHeaderDTO } from './validators/add-header';
import { PrismaErrorCodes, ResponseMessages, TemplateType, UserTypes } from 'src/core/utils';
import { Decimal, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JobProjectEstimatorDTO } from './validators/add-project-estimator';
import { JobProjectEstimatorAccountingDTO } from './validators/add-project-estimator-accounting';
import { BulkUpdateProjectEstimatorDTO } from './validators/pe-bulk-update';
import { UpdateStatementDTO } from './validators/update-statement';
import { ProfitCalculationType } from 'src/core/utils/company';
import { marginCalculation, markupCalculation, ProfitCalculationTypeEnum } from 'src/core/utils/profit-calculation';

@Injectable()
export class JobProjectEstimatorService {

    constructor(private databaseService: DatabaseService) { }

    // Get all headers and project estimator data
    async getProjectEstimatorData(user: User, companyId: number, jobId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let prData = await this.databaseService.jobProjectEstimatorHeader.findMany({
                    where: {
                        companyId,
                        jobId,
                        isDeleted: false,
                        name: { not: 'Statements' } // Filter out headers named 'Statements'
                    },
                    select: {
                        id: true,
                        name: true,
                        companyId: true,
                        jobId: true,
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
                                isSalesTaxApplicable: true,
                                salesTaxPercentage: true,
                                isCourtesyCredit: true,
                                isDeleted: true,
                                jobProjectEstimatorHeaderId: true,
                            },
                            orderBy: {
                                order: 'asc'
                            }
                        }
                    },
                    orderBy: {
                        headerOrder: 'asc'
                    }
                });

                const projectEstimatorData = prData.map(item => {
                    const isChangeOrder = item.name === "Change Orders";

                    return {
                        ...item,
                        JobProjectEstimator: item.JobProjectEstimator.map(estimator => {
                            const unitCost = +estimator.unitCost;
                            const actualCost = +estimator.actualCost;
                            const grossProfit = +estimator.grossProfit;
                            let contractPrice = +estimator.contractPrice;
                            const isSalesTaxApplicable = estimator.isSalesTaxApplicable;
                            const salesTaxPercentage = +estimator.salesTaxPercentage;

                            const salesTax = isSalesTaxApplicable
                                ? +((contractPrice * salesTaxPercentage) / 100).toFixed(2)
                                : 0;

                            // Add sales tax to contract price only for "Change Order"
                            if (isChangeOrder) {
                                contractPrice += salesTax;
                            }
                            return {
                                ...estimator,
                                unitCost: unitCost.toFixed(2),
                                actualCost: actualCost.toFixed(2),
                                grossProfit: grossProfit.toFixed(2),
                                contractPrice: contractPrice.toFixed(2),
                                salesTax: salesTax
                            };
                        })
                    }
                });

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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
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

                let clientTemplate = await this.databaseService.clientTemplate.findFirst({
                    where: {
                        jobId: job.id,
                        customerId: job.customerId,
                        companyId,
                        isDeleted: false,
                        questionnaireTemplateId: job.templateId
                    },
                    orderBy: { id: 'desc' },
                    take: 1,
                });

                if (!clientTemplate || !clientTemplate?.id) {
                    throw new ForbiddenException('Template not found');
                }

                let { _max: order } = await this.databaseService.jobProjectEstimatorHeader.aggregate({
                    _max: {
                        headerOrder: true,
                    },
                    where: {
                        isDeleted: false,
                        jobId,
                        clientTemplateId: clientTemplate.id,
                        companyId,
                        name: {
                            not: "Change Orders"
                        }
                    },
                })

                let headerOrder = (order.headerOrder ?? 0) + 1;
                let projectEstimatorHeader = await this.databaseService.jobProjectEstimatorHeader.create({
                    data: {
                        companyId,
                        jobId,
                        clientTemplateId: clientTemplate.id,
                        name: body.name,
                        headerOrder
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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
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

                let job = await this.databaseService.job.findUnique({
                    where: { id: jobId }
                });

                let clientTemplate = await this.databaseService.clientTemplate.findFirst({
                    where: {
                        jobId,
                        customerId: job.customerId,
                        companyId,
                        isDeleted: false,
                        questionnaireTemplateId: job.templateId
                    },
                    orderBy: { id: 'desc' },
                    take: 1,
                });

                // restrict Change Orders header delete
                if (header.name.toLowerCase().replace(/\s/g, '') === "changeorders") {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const delHeaderOrder = header.headerOrder;
                const delHeaderId = header.id;
                const delTemplateId = header.clientTemplateId
                const res = await this.databaseService.$transaction(async (tx) => {
                    await tx.jobProjectEstimatorHeader.updateMany({
                        where: { id: delHeaderId },
                        data: { isDeleted: true, headerOrder: 0 }
                    }),
                        await tx.jobProjectEstimator.updateMany({
                            where: { jobProjectEstimatorHeaderId: delHeaderId },
                            data: { isDeleted: true, order: 0 }
                        }),
                        await tx.jobProjectEstimatorHeader.updateMany({
                            where: {
                                clientTemplateId: delTemplateId,
                                headerOrder: {
                                    gt: delHeaderOrder
                                }
                            },
                            data: { headerOrder: { decrement: 1 } }

                        })
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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                const company = await this.databaseService.company.findUniqueOrThrow({
                    where: {
                        id: companyId,
                        isDeleted: false,
                    }
                })

                let { _max: maxOrder } = await this.databaseService.jobProjectEstimator.aggregate({
                    _max: {
                        order: true
                    },
                    where: {
                        isDeleted: false,
                        jobProjectEstimatorHeaderId: body.jobProjectEstimatorHeaderId,

                    }
                })
                const order = (maxOrder?.order ?? 0) + 1;
                let projectEstimator = await this.databaseService.jobProjectEstimator.create({
                    data: {
                        ...body,
                        order
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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
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

                let salesTax = 0;
                if (
                    projectEstimator.isSalesTaxApplicable &&
                    projectEstimator.contractPrice &&
                    projectEstimator.salesTaxPercentage
                ) {
                    salesTax = Number(
                    (
                        (Number(projectEstimator.contractPrice) *
                        Number(projectEstimator.salesTaxPercentage)) /
                        100
                    ).toFixed(2)
                    );
                }
                // Add sales tax to contract price only for "Change Order"
                let estimatorHeader = await this.databaseService.jobProjectEstimatorHeader.findUniqueOrThrow({
                    where: { id: projectEstimator.jobProjectEstimatorHeaderId }
                });
                if (estimatorHeader.name === "Change Orders") {
                    projectEstimator.contractPrice = new Decimal(projectEstimator.contractPrice).plus(salesTax);
                }
                return {
                    projectEstimator: {
                      ...projectEstimator,
                      salesTax,
                    }
                  };

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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const pr = await this.databaseService.jobProjectEstimator.findUnique({
                where: { id: projectEstimatorId },
                select: {
                    id: true,
                    isDeleted: true,
                    order: true,
                    jobProjectEstimatorHeaderId: true,
                },
                });

                if (!pr) {
                    return { message: ResponseMessages.SUCCESSFUL };
                }

                if (pr.isDeleted) {
                    return { message: ResponseMessages.SUCCESSFUL };
                }


                const deleteOrder = pr.order;
                const deleteHeaderId = pr.jobProjectEstimatorHeaderId;
                                
                const deleteResult =  await this.databaseService.jobProjectEstimator.updateMany({
                    where: {
                    id: projectEstimatorId,
                    isDeleted: false, 
                    },
                    data: {
                    isDeleted: true,
                    order: 0,
                    },
                });

                if (deleteResult.count === 0) {
                return { message: ResponseMessages.SUCCESSFUL };
                }

                await this.databaseService.jobProjectEstimator.updateMany({
                where: {
                    jobProjectEstimatorHeaderId: deleteHeaderId,
                    isDeleted: false,
                    order: { gt: deleteOrder },
                },
                data: {
                    order: { decrement: 1 },
                },
                });

                return { message: ResponseMessages.SUCCESSFUL };
             } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === PrismaErrorCodes.NOT_FOUND) {
                throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
            }

            throw new BadRequestException('Invalid request');
            }

            if (error instanceof ForbiddenException) {
            throw error;
            }
            if (error instanceof BadRequestException) {
            throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // create new project estimator data row for Accounting section
    async createProjectEstimatorAccounting(user: User, companyId: number, jobId: number, body: JobProjectEstimatorAccountingDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let job = await this.databaseService.job.findUnique({
                    where: { id: jobId }
                });

                let company = await this.databaseService.company.findUniqueOrThrow({
                    where: { id: companyId, isDeleted: false, }
                })
                let clientTemplate = await this.databaseService.clientTemplate.findFirst({
                    where: {
                        jobId: job.id,
                        customerId: job.customerId,
                        companyId,
                        isDeleted: false,
                        questionnaireTemplateId: job.templateId
                    },
                    orderBy: { id: 'desc' },
                    take: 1,
                });

                if (!clientTemplate || !clientTemplate?.id) {
                    throw new ForbiddenException('Template not found');
                }
                // check header already exist or not else create new one
                let accountingHeader = await this.databaseService.jobProjectEstimatorHeader.findFirst({
                    where: {
                        companyId,
                        jobId,
                        clientTemplateId: clientTemplate.id,
                        name: body.headerName,
                        isDeleted: false,
                    }
                });

                if (!accountingHeader) {
                    let createdHeader = await this.databaseService.jobProjectEstimatorHeader.create({
                        data: {
                            companyId,
                            jobId,
                            clientTemplateId: clientTemplate.id,
                            name: body.headerName
                        }
                    });
                    accountingHeader = createdHeader;
                }

                const { headerName, ...projectEstimatorData } = body;

                let { _max: itemOrder } = await this.databaseService.jobProjectEstimator.aggregate({
                    _max: {
                        order: true
                    },
                    where: {
                        jobProjectEstimatorHeaderId: accountingHeader.id,
                        isDeleted: false
                    }
                })

                let order = (itemOrder.order ?? 0) + 1;
                // insert new row for accounting
                let projectEstimator = await this.databaseService.jobProjectEstimator.create({
                    data: {
                        jobProjectEstimatorHeader: {
                            connect: { id: accountingHeader.id }
                        },
                        ...projectEstimatorData,
                        order
                    }
                });

                // Find the highest invoice ID for this company
                let previousHighestInvoice = await this.databaseService.jobProjectEstimator.aggregate({
                    _max: {
                        invoiceId: true
                    },
                    where: {
                        jobProjectEstimatorHeader: {
                            companyId: companyId
                        },
                        isDeleted: false,
                    }
                });

                // Assign new invoice ID based on previous highest invoice
                let newInvoiceId = previousHighestInvoice._max.invoiceId === null
                    ? 1100
                    : previousHighestInvoice._max.invoiceId + 1;

                // Insert invoice ID for change orders
                if (projectEstimator.item === 'Change Order') {

                    await this.databaseService.jobProjectEstimator.update({
                        where: { id: projectEstimator.id },
                        data: { invoiceId: newInvoiceId },
                    });

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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
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
                    JobProjectEstimator: header.JobProjectEstimator.map(estimator => {
                        const unitCost = Number(estimator.unitCost);
                        const actualCost = Number(estimator.actualCost);
                        const grossProfit = Number(estimator.grossProfit);
                        const contractPrice = Number(estimator.contractPrice);
                        const isSalesTaxApplicable = estimator.isSalesTaxApplicable;
                        const salesTaxPercentage = Number(estimator.salesTaxPercentage);
                
                        const salesTax = isSalesTaxApplicable
                            ? Number(((contractPrice * salesTaxPercentage) / 100).toFixed(2))
                            : 0;
                
                        return {
                            ...estimator,
                            unitCost: unitCost.toFixed(2),
                            actualCost: actualCost.toFixed(2),
                            grossProfit: grossProfit.toFixed(2),
                            contractPrice: contractPrice.toFixed(2),
                            salesTax: salesTax
                        };
                    })
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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
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
                        isSalesTaxApplicable: true,
                        salesTaxPercentage: true,
                        createdAt: true,
                        invoiceId: true
                    },
                });

                const formattedData = changeOrders.map(changeOrder => {
                    const contractPrice = Number(changeOrder.contractPrice);
                    const isSalesTaxApplicable = changeOrder.isSalesTaxApplicable;
                    const salesTaxPercentage = Number(changeOrder.salesTaxPercentage);
                    const salesTax = isSalesTaxApplicable
                        ? Number(((contractPrice * salesTaxPercentage) / 100).toFixed(2))
                        : 0;
                
                    return {
                        ...changeOrder,
                        contractPrice: salesTax + contractPrice
                    };
                });
                
                return { changeOrders: formattedData };
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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
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

                const formattedData = statements.map(statement => {
                    const contractPrice = Number(statement.contractPrice);
                    const isSalesTaxApplicable = statement.isSalesTaxApplicable;
                    const salesTaxPercentage = Number(statement.salesTaxPercentage);
                    const salesTax = isSalesTaxApplicable
                        ? Number(((contractPrice * salesTaxPercentage) / 100).toFixed(2))
                        : 0;
                
                    return {
                        ...statement,
                        contractPrice: contractPrice + salesTax
                    };
                });

                return { statements: formattedData }
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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
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

    async updateProfitCalculationType(user: User, companyId: number, jobId: number, body: { profitCalculationType: ProfitCalculationTypeEnum }) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const clientTemplate = await this.databaseService.clientTemplate.findFirstOrThrow({
                    where: { jobId, isDeleted: false, companyId, },
                    orderBy: { createdAt: 'desc' }
                })

                await this.databaseService.clientTemplate.update({
                    where: { id: clientTemplate.id, isDeleted: false },
                    data: { accProfitCalculationType: body.profitCalculationType }
                });

                if (body.profitCalculationType !== clientTemplate.accProfitCalculationType) {
                    this.updateProjectEstimatorRows(companyId, jobId);
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
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();

        }
    }

    private async updateProjectEstimatorRows(companyId: number, jobId: number) {
        try {
            const company = await this.databaseService.company.findFirstOrThrow({
                where: { id: companyId, isDeleted: false }
            });

            const headers = await this.databaseService.jobProjectEstimatorHeader.findMany({
                where: { isDeleted: false, companyId, jobId },
                include: {
                    JobProjectEstimator: {
                        where: { isDeleted: false }
                    }
                }
            });
            // Loop through each header
            for (const header of headers) {
                const dataItems = header.JobProjectEstimator;

                // Loop through each data item
                for (const data of dataItems) {
                    const unitCost = parseFloat(data.unitCost.toString());
                    const quantity = parseFloat(data.quantity.toString());
                    const grossProfit = parseFloat(data.grossProfit.toString());

                    const contractPrice =
                        company.profitCalculationType === ProfitCalculationType.MARKUP
                            ? markupCalculation(quantity * unitCost, grossProfit)
                            : marginCalculation(quantity * unitCost, grossProfit);

                    // Update the data
                    const result = await this.databaseService.jobProjectEstimator.update({
                        where: { id: data.id, isDeleted: false },
                        data: {
                            contractPrice,
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Error updating project estimator transaction:", error);
            throw new InternalServerErrorException({
                error: "An unexpected error occured.",
                errorDetails: error.message
            })
        }
    }
    
    public async saveAsTemplate(user: User, companyId: number, jobId: number, body: { templateName: string }) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Fetch job and client template in parallel
                const [job, clientTemplate] = await Promise.all([
                    this.databaseService.job.findUnique({
                        where: {
                            id: jobId,
                            companyId,
                            isDeleted: false,
                            isClosed: false
                        },
                        include: { customer: true }
                    }),
                    this.databaseService.clientTemplate.findFirst({
                        where: {
                            companyId,
                            jobId,
                            isDeleted: false
                        }
                    })
                ]);

                if (!job) {
                    return { success: false, message: "Could not find job details." };
                }

                if (!clientTemplate) {
                    return { success: false, message: "Unable to fetch the client template details." };
                }

                // Fetch project estimator data
                const prData = await this.databaseService.jobProjectEstimatorHeader.findMany({
                    where: {
                        companyId,
                        jobId,
                        isDeleted: false
                    },
                    include: {
                        JobProjectEstimator: {
                            where: { isDeleted: false },
                            orderBy: { order: 'asc' }
                        }
                    },
                    orderBy: { headerOrder: 'asc' }
                });

                if (!prData.length) {
                    return { success: false, message: "No project estimator data found." };
                }

                // Execute transaction
                const result = await this.databaseService.$transaction(async (tx) => {
                    // Create template
                    const projectEstimatorTemplate = await tx.projectEstimatorTemplate.create({
                        data: {
                            templateName: body.templateName,
                            companyId,
                            profitCalculationType: clientTemplate.accProfitCalculationType
                        }
                    });

                    // Create questionnaire template
                    await tx.questionnaireTemplate.create({
                        data: {
                            name: body.templateName,
                            isCompanyTemplate: true,
                            companyId,
                            templateType: TemplateType.PROJECT_ESTIMATOR,
                            projectEstimatorTemplateId: projectEstimatorTemplate.id,
                        }
                    });

                    // Create headers and their data in a more efficient way
                    await Promise.all(prData.map(async (prEst) => {
                        const header = await tx.projectEstimatorTemplateHeader.create({
                            data: {
                                name: prEst.name,
                                companyId,
                                petId: projectEstimatorTemplate.id,
                                headerOrder: prEst.headerOrder
                            }
                        });

                        // Batch create template data entries
                        const dataEntries = prEst.JobProjectEstimator.map(estData => ({
                            item: estData.item,
                            description: estData.description,
                            costType: estData.costType,
                            quantity: estData.quantity,
                            unitCost: estData.unitCost,
                            actualCost: estData.actualCost,
                            grossProfit: estData.grossProfit,
                            contractPrice: estData.contractPrice,
                            isLotCost: estData.isLootCost,
                            isSalesTaxApplicable: estData.isSalesTaxApplicable,
                            salesTaxPercentage: estData.salesTaxPercentage,
                            isCourtesyCredit: estData.isCourtesyCredit,
                            petHeaderId: header.id,
                            order: estData.order,
                        }));

                        if (dataEntries.length) {
                            await tx.projectEstimatorTemplateData.createMany({
                                data: dataEntries
                            });
                        }
                    }));

                    return projectEstimatorTemplate;
                });

                return {
                    success: true,
                    message: ResponseMessages.SUCCESSFUL,
                    data: result
                };

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
