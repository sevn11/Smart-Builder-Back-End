import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UpdateCompanyLogoDTO } from './validators';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';

@Injectable()
export class WebhooksService {
    constructor(private databaseService: DatabaseService) {

    }

    async updateLogoUrl(companyId: number, body: UpdateCompanyLogoDTO) {
        // Checking webhook
        return { message: ResponseMessages.SUCCESSFUL }
        try {
            let company = await this.databaseService.company.findUniqueOrThrow({
                where: {
                    id: companyId
                }
            });
            await this.databaseService.company.update({
                where: {
                    id: company.id
                },
                data: {
                    logo: body.key
                }
            });
            return { message: ResponseMessages.SUCCESSFUL }
        } catch (error) {
            console.log(error);
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.COMPANY_NOT_FOUND)
                throw new InternalServerErrorException();
            } else {
                throw new InternalServerErrorException();
            }
        }
    }


    async handleStripeWebhook(body: any) {
        if(body.type === "customer.subscription.deleted"){

            const invoice = body.data.object;
            const customerId = invoice;
            const user = await this.databaseService.user.findFirst({
                where: { subscriptionId: invoice.id }
            });
            
            if (user) {
                await this.databaseService.user.update({
                    where: { id: user.id },
                    data: {
                        accountStatus: 'inactive',
                        subscriptionId: null,
                        cardOnFile: false,
                        trialEndsAt: null,
                        planStartsAt: null,
                    }
                });
            }
        }

        if (body.type === 'payment_intent.succeeded') {

            const invoice = body.data.object;
            const customerId = invoice.customer;
            const user = await this.databaseService.user.findFirst({
                where: { stripeCustomerId: customerId }
            });

            if (user) {
                console.log(user)
                await this.databaseService.user.update({
                    where: { id: user.id },
                    data: {
                        accountStatus: 'active',
                        cardOnFile: true,
                    }
                });
            }
        }
        // Handle subscription status changes (canceled, paused)
        if (body.type == 'customer.subscription.updated' || body.type == 'customer.subscription.deleted' || body.type == 'customer.subscription.paused') {
            let subscriptionId = body.data.object.id;
            let subscriptionStatus = body.data.object.status;

            // Find user by main subscription or sign-here subscription
            let user = await this.databaseService.user.findFirst({
                where: { subscriptionId }
            });

            console.log(user)
            const isPaused = body.data.object.pause_collection !== null && 
                 body.data.object.pause_collection !== undefined;
            
            const isResumed = body.data.previous_attributes?.pause_collection !== null &&
                  body.data.previous_attributes?.pause_collection !== undefined &&
                  body.data.object.pause_collection === null;

            const isTrialEnded =
                body.type === 'customer.subscription.updated' &&
                body.data.previous_attributes?.status === 'trialing' &&
                body.data.object.status !== 'trialing';

            // Handle trial ended
            if (user && isTrialEnded) {
                await this.databaseService.user.update({
                    where: { id: user.id },
                    data: {
                        planExpiresAt: new Date(),
                    }
                });
            }

            // Handle paused status (trial expired without payment method)
            if (user && isPaused) {
                let pausedDate = new Date();

                await this.databaseService.user.update({
                    where: { id: user.id },
                    data: {
                        accountStatus: 'inactive',
                    }
                });

                await this.databaseService.paymentLog.create({
                    data: {
                        userId: user.id,
                        paymentDate: pausedDate,
                        paymentId: body.data.object.id,
                        amount: 0,
                        status: 'paused',
                        response: body.data.object
                    }
                });
                return;
            }

            if (user && isResumed) {
                let pausedDate = new Date();

                await this.databaseService.user.update({
                    where: { id: user.id },
                    data: {
                        accountStatus: 'active',
                    }
                });

                await this.databaseService.paymentLog.create({
                    data: {
                        userId: user.id,
                        paymentDate: pausedDate,
                        paymentId: body.data.object.id,
                        amount: 0,
                        status: 'Resumed',
                        response: body.data.object
                    }
                });
                return;
            }


            // Handle canceled status
            if (user && subscriptionStatus == "canceled") {
                let canceledDate = new Date(body.data.object.canceled_at * 1000);
                const month = canceledDate.getMonth() + 1;
                const year = canceledDate.getFullYear();

                let existingLog = await this.databaseService.paymentLog.findFirst({
                    where: {
                        userId: user.id,
                        paymentDate: {
                            gte: new Date(year, month - 1, 1),
                            lte: new Date(year, month, 1)
                        }
                    }
                });

                if (existingLog) {
                    await this.databaseService.paymentLog.update({
                        where: { id: existingLog.id },
                        data: {
                            paymentDate: canceledDate,
                            paymentId: body.data.object.latest_invoice,
                            amount: body.data.object.plan.amount,
                            status: 'canceled',
                            response: body.data.object
                        }
                    });
                } else {
                    await this.databaseService.paymentLog.create({
                        data: {
                            userId: user.id,
                            paymentDate: canceledDate,
                            paymentId: body.data.object.id,
                            amount: body.data.object.plan.amount,
                            status: 'canceled',
                            response: body.data.object
                        }
                    });
                }
                // Make user inactive
                await this.databaseService.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        accountStatus: 'inactive',
                        cardOnFile: false,
                    }
                });
                return;
            }
        }


        let paymentDate = new Date(body.data.object.created * 1000)
        let user = await this.databaseService.user.findFirst({
            where: { subscriptionId: body.data.object.id }
        });

        if (user) {
            const month = paymentDate.getMonth() + 1;
            const year = paymentDate.getFullYear();

            let existingLog = await this.databaseService.paymentLog.findFirst({
                where: {
                    userId: user.id,
                    paymentDate: {
                        gte: new Date(year, month - 1, 1),
                        lte: new Date(year, month, 1)
                    }
                }
            });

            let status: string;
            switch (body.type) {
                case 'invoice.created':
                    status = 'processing';
                    break;
                case 'invoice.paid':
                    status = 'successful';
                    break;
                case 'invoice.payment_failed':
                    status = 'failed';
                    break;
                default:
                    return;
            }

            if (existingLog) {
                await this.databaseService.paymentLog.update({
                    where: { id: existingLog.id },
                    data: {
                        paymentDate,
                        paymentId: body.data.object.id,
                        amount: body.data.object.amount_due,
                        status,
                        response: body.data.object
                    }
                });
            } else {
                await this.databaseService.paymentLog.create({
                    data: {
                        userId: user.id,
                        paymentDate,
                        paymentId: body.data.object.id,
                        amount: body.data.object.amount_due,
                        status,
                        response: body.data.object
                    }
                });
            }
        }
        return
    }
}
