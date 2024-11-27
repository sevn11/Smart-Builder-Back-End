import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { ChangeBuilderAccessDTO, GetBuilderListDTO } from '../validators';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateUpdateExtraFeeDTO } from '../validators/create-update-extra-fee';
import { StripeService } from 'src/core/services/stripe.service';
import { UpdateBuilderPlanInfoDTO } from '../validators/update-plan-info';
import { BuilderPlanTypes } from 'src/core/utils/builder-plan-types';
import { SendgridService } from 'src/core/services';
import { ConfigService } from '@nestjs/config';
import { UpdateBuilderPlanAmountDTO } from '../validators/update-builder-plan';

@Injectable()
export class AdminUsersService {
    constructor(
        private databaseService: DatabaseService, 
        private stripeService: StripeService, 
        private sendgridService: SendgridService,
        private readonly config: ConfigService
    ) {

    }
    async getBuilders(query: GetBuilderListDTO) {
        try {
            query.page = query.page === 0 ? 0 : query.page - 1

            let [builders, totalCount] = await this.databaseService.$transaction([
                this.databaseService.user.findMany({
                    where: {
                        userType: UserTypes.BUILDER,
                        isActive: query.isActive,
                        name: {
                            contains: query.search,
                            mode: 'insensitive'
                        },
                        isDeleted: false,
                    },
                    skip: query.page * query.limit,
                    take: query.limit,
                    omit: {
                        hash: true,
                        invitationToken: true,
                        passwordResetCode: true,
                        isDeleted: false,
                    },
                    include: {
                        company: {
                            select: {
                                name: true,
                                id: true,
                                extraFee: true,
                                planType: true,
                                planAmount: true
                            }
                        }
                    }
                }),
                this.databaseService.user.count({
                    where: {
                        userType: UserTypes.BUILDER,
                        isActive: query.isActive,
                        name: {
                            contains: query.search,
                            mode: 'insensitive'
                        },
                        isDeleted: false,
                    },
                })

            ]);
            return { builders, totalCount }
        } catch (error) {
            console.log(error);
            throw new InternalServerErrorException()
        }
    }
    async changeBuilderAccess(builderId: number, body: ChangeBuilderAccessDTO) {
        try {
            let builder = await this.databaseService.user.findUniqueOrThrow({
                where: {
                    id: builderId,
                    isDeleted: false,
                }
            });
            let [, user,] = await this.databaseService.$transaction([
                this.databaseService.company.update({
                    where: {
                        id: builder.companyId,
                        isDeleted: false
                    },
                    data: {
                        isActive: body.isActive
                    }
                }),
                this.databaseService.user.update({
                    where: {
                        id: builderId,
                        isDeleted: false
                    },
                    data: {
                        isActive: body.isActive
                    },
                    omit: {
                        hash: true,
                        invitationToken: true,
                        passwordResetCode: true,
                        isDeleted: true
                    },
                    include: {
                        company: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
                }),
                this.databaseService.user.updateMany({
                    where: {
                        companyId: builder.companyId,
                        isDeleted: false
                    },
                    data: {
                        isActive: body.isActive
                    }
                }),

            ]);
            return { user }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    async deleteBuilder(builderId: number) {
        try {
            let builder = await this.databaseService.user.findUniqueOrThrow({
                where: {
                    id: builderId,
                    isDeleted: false
                }
            });
            let employees = await this.databaseService.user.findMany({
                where: {
                    isActive: true,
                    isDeleted: false,
                    companyId: builder.companyId,
                    userType: UserTypes.EMPLOYEE
                }
            });
            // Delete builder's and employees subscription from stripe
            await this.stripeService.removeSubscription(builder.subscriptionId);
            if(employees.length > 0) {
                for (const employee of employees) {
                    await this.stripeService.removeSubscription(employee.subscriptionId);
                    await this.databaseService.user.update({
                        where: { id: employee.id },
                        data: { subscriptionId: null, productId: null }
                    });
                }
            }
            // Delete customer from stripe
            await this.stripeService.deleteStripeCustomer(builder.stripeCustomerId);
            
            await this.databaseService.$transaction([
                this.databaseService.company.update({
                    where: {
                        id: builder.companyId,
                        isDeleted: false,
                    },
                    data: {
                        isActive: false,
                        isDeleted: true
                    }
                }),
                this.databaseService.user.update({
                    where: {
                        id: builderId,
                        isDeleted: false
                    },
                    data: {
                        isActive: false,
                        isDeleted: true,
                        subscriptionId: null,
                        productId: null
                    },
                }),
                this.databaseService.user.updateMany({
                    where: {
                        companyId: builder.companyId,
                        isDeleted: false
                    },
                    data: {
                        isActive: false,
                        isDeleted: true
                    },
                }),
                this.databaseService.customer.updateMany({
                    where: {
                        companyId: builder.companyId,
                        isDeleted: false
                    },
                    data: {
                        isDeleted: true
                    },
                }),
                this.databaseService.job.updateMany({
                    where: {
                        companyId: builder.companyId,
                        isDeleted: false
                    },
                    data: {
                        isDeleted: true
                    },
                }),
                this.databaseService.questionnaireTemplate.updateMany({
                    where: {
                        companyId: builder.companyId,
                        isDeleted: false
                    },
                    data: {
                        isDeleted: true
                    },
                }),
                this.databaseService.category.updateMany({
                    where: {
                        companyId: builder.companyId,
                        isDeleted: false
                    },
                    data: {
                        isDeleted: true
                    },
                }),
            ]);
            return { message: ResponseMessages.BUILDER_REMOVED }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    async addUpdateExtraFee(body: CreateUpdateExtraFeeDTO) {
        const { companyId, extraFee = 20.00 } = body;

        try {
            // Check if the company exists
            const company = await this.databaseService.company.findFirst({
                where: { id: companyId },
            });

            if (!company) {
                throw new BadRequestException('Company not found');
            }


            // Convert company's extraFee (Decimal) to a number before comparing
            if (company.extraFee.toNumber() !== extraFee) {
                await this.databaseService.company.update({
                    where: { id: companyId },
                    data: { extraFee },
                });
            }

            // Update fee in stripe subscription
            let builder = await this.databaseService.user.findFirst({
                where: {
                    companyId,
                    userType: UserTypes.BUILDER
                },
                include: { company: true }
            });
            let employees = await this.databaseService.user.findMany({
                where: {
                    companyId,
                    userType: UserTypes.EMPLOYEE
                }
            })
            if (builder && builder.stripeCustomerId) {
                if (employees.length > 0) {
                    // Update subscription for each employee
                    const updatePromises = employees.map(async (employee) => {
                        if (employee.subscriptionId) {
                            let newAmount = extraFee * 100;
                            let planType = builder.company.planType == BuilderPlanTypes.MONTHLY ? 'month' : 'year';
                            if (planType === 'year') {
                                newAmount *= 12;
                            }
                            await this.stripeService.updateSubscriptionAmount(builder.stripeCustomerId, employee, newAmount, planType);
                        }
                    });
            
                    await Promise.all(updatePromises);
                }
            }
            return { message: 'Extra fee updated successfully' };
        } catch (error) {
            console.error(error);

            // Handle specific Prisma exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException('Company not found');
                }
            }

            throw new InternalServerErrorException('An error occurred while updating the extra fee.');
        }
    }

    async getBuilderPlanInfo() {
        try {
            let data = await this.databaseService.seoSettings.findMany();
            let planInfo = {
                id: data[0].id,
                monthlyPlanAmount: data[0].monthlyPlanAmount,
                yearlyPlanAmount: data[0].yearlyPlanAmount,
                employeeFee: data[0].additionalEmployeeFee
            }
            return { planInfo }
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                }
            }

            throw new InternalServerErrorException();
        }
    }

    async updateBuilderPlanInfo(body: UpdateBuilderPlanInfoDTO) {
        try {
            let updatedPlan = await this.databaseService.seoSettings.update({
                where: { id: 1},
                data: {
                    ...body.plans
                }
            })

            if(body.applyToCurrentUsers) {
                // update planAmount based in plantype(monthly / yearly) for each company
                let builders = await this.databaseService.user.findMany({
                    where: {
                        isActive: true,
                        isDeleted: false,
                        userType: UserTypes.BUILDER
                    },
                    include: { company: true }
                });
                if (builders.length > 0) {
                    let price = 0;
                    for (const builder of builders) {
                        if(builder.company.planType == BuilderPlanTypes.MONTHLY) {
                            price = updatedPlan.monthlyPlanAmount.toNumber();
                            await this.databaseService.company.update({
                                where: { id: builder.companyId, planType: BuilderPlanTypes.MONTHLY },
                                data: { planAmount: price}
                            });
                        }
                        if(builder.company.planType == BuilderPlanTypes.YEARLY) {
                            price = updatedPlan.yearlyPlanAmount.toNumber();
                            await this.databaseService.company.update({
                                where: { id: builder.companyId, planType: BuilderPlanTypes.YEARLY },
                                data: { planAmount: price}
                            });
                        }
                        let newPrice = price * 100;
                        let planType = builder.company.planType == BuilderPlanTypes.MONTHLY ? 'month' : 'year';
                        await this.stripeService.updateSubscriptionAmount(builder.stripeCustomerId, builder, newPrice, planType);
                    }
                    // Send mail to each user's about plan change
                    if(body.notifyUsers) {
                        if (builders.length > 0) {
                            for (const builder of builders) {
                                let templateData = {
                                    user_name: builder.name,
                                    plan_type: builder.company.planType == BuilderPlanTypes.MONTHLY ? 'monthly' : 'yearly',
                                    new_plan_amount: price
                                }
                                this.sendgridService.sendEmailWithTemplate(builder.email, this.config.get('BUILDER_PLAN_CHANGE_TEMPLATE_ID'), templateData)
                            }
                        }
                    }
                }

            }
          
            return updatedPlan;
        } catch (error) {
            throw new InternalServerErrorException();
        }
    }

    async changeBuilderPlanAmount(body: UpdateBuilderPlanAmountDTO) {
        const { companyId, planAmount } = body;

        try {
            // Check if the company exists
            const company = await this.databaseService.company.findFirst({
                where: { id: companyId },
            });

            if (!company) {
                throw new BadRequestException('Company not found');
            }

            let builder = await this.databaseService.user.findFirst({
                where: { companyId }
            })

            // Convert company's planAmount (Decimal) to a number before comparing
            if (company.planAmount.toNumber() !== planAmount) {
                let newData = await this.databaseService.company.update({
                    where: { id: companyId },
                    data: { planAmount },
                });
                let newPrice = newData.planAmount.toNumber() * 100;
                let planType = newData.planType == BuilderPlanTypes.MONTHLY ? 'month' : 'year';
                await this.stripeService.updateSubscriptionAmount(builder.stripeCustomerId, builder, newPrice, planType);
            }

            return { message: 'Subscription amount updated successfully' };
        } catch (error) {
            console.error(error);

            // Handle specific Prisma exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException('Company not found');
                }
            }

            throw new InternalServerErrorException('An error occurred while updating the extra fee.');
        }
    }

    async updateGlobalEmployeeFee(body: {employeeFee: number}) {
        try {
            let updatedPlan = await this.databaseService.seoSettings.update({
                where: { id: 1},
                data: {
                    additionalEmployeeFee: body.employeeFee
                }
            });
            return { message: "Employee fee updated" }
        } catch (error) {
            throw new InternalServerErrorException();
        }
    }
}
