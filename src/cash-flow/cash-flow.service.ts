import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { CashFlowDTO } from './validators/cash-flow';

@Injectable()
export class CashFlowService {

    constructor(
        private databaseService: DatabaseService
    ) {
    }

    // get all open projects with sales and profit
    async getCashFlowProjects(user: User, companyId: number) {
        try {
            if (user.companyId === companyId || user.userType === UserTypes.ADMIN) {
                await this.databaseService.company.findUniqueOrThrow({
                    where: {
                        id: companyId,
                        isActive: true,
                        isDeleted: false
                    }
                });

                const [projects, cashFlowData] = await Promise.all([
                    this.databaseService.job.findMany({
                        where: {
                            companyId,
                            isClosed: false,
                            isDeleted: false
                        },
                        include: {
                            customer: true,
                            JobProjectEstimatorHeader: {
                                where: { isDeleted: false },
                                include: {
                                    JobProjectEstimator: {
                                        where: { isDeleted: false }
                                    }
                                }
                            }
                        }
                    }),
                    this.databaseService.cashFlow.findUnique({
                        where: { companyId }
                    })
                ]);

                // find total sales/contract price and profit from estimator 
                const formattedProjects = projects.map(project => {
                    const customerName = project.customer.name;
                    const description = project.description;
                
                    // Initialize variables for aggregated values
                    let totalSales = 0;
                    let totalEstimatedCost = 0;
                    
                    project.JobProjectEstimatorHeader.forEach(header => {
                        header.JobProjectEstimator.forEach(estimator => {
                            const sales = Number(estimator.contractPrice).toFixed(2) || "0";
                            const unitCost = Number(estimator.unitCost).toFixed(2) || "0";
                            const quantity = estimator.quantity || 0;
                            let estimatedCost = (
                                parseFloat(sales.toString()) -
                                parseFloat(unitCost.toString()) *
                                  parseFloat(quantity.toString())
                            )
                            
                            totalSales = totalSales + parseFloat(sales);
                            totalEstimatedCost += parseFloat(estimatedCost.toString());
                        });
                    });

                    let roundedSales = parseFloat(totalSales.toString()).toFixed();
                    let roundedProfit = parseFloat(totalEstimatedCost.toString()).toFixed();
                
                    return {
                        id: project.id,
                        customerName,
                        description,
                        sales: parseFloat(roundedSales),
                        projectProfit: parseFloat(roundedProfit)
                    };
                });

                return {
                    salesDeduction: cashFlowData?.salesDeduction ?? 0,
                    deduction: cashFlowData?.deduction ?? 0,
                    depreciation: cashFlowData?.depreciation ?? 0,
                    expenses: cashFlowData?.expense ?? 0,
                    projects: formattedProjects
                };
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.COMPANY_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // save cash flow data
    async saveCashFlow(user: User, companyId: number, body: CashFlowDTO) {
        try {
            if (user.companyId === companyId || user.userType === UserTypes.ADMIN) {
                // update if already exist else insert
                await this.databaseService.cashFlow.upsert({
                    where: { companyId },
                    update: {
                        salesDeduction: body.salesDeduction ?? 0,
                        deduction: body.deduction ?? 0,
                        depreciation: body.depreciation ?? 0,
                        expense: body.expenses ?? 0
                    },
                    create: {
                        companyId: companyId,
                        salesDeduction: body.salesDeduction ?? 0,
                        deduction: body.deduction ?? 0,
                        depreciation: body.depreciation ?? 0,
                        expense: body.expenses ?? 0
                    }
                });

                return ResponseMessages.SUCCESSFUL;
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.COMPANY_NOT_FOUND);
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