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


    async handleStripeWebhook (body: any) {
        // Seperate logic for subscription canceled event
        if(body.type == 'customer.subscription.updated') {
            let canceledDate = new Date(body.data.object.canceled_at * 1000);
            let subscriptionId = body.data.object.id;
            let user = await this.databaseService.user.findFirst({
                where: { subscriptionId }
            });
            if(user && body.data.object.status == "canceled") {
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
                // Make employee as incactive
                await this.databaseService.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        isActive: false
                    }
                });
                return;
            }
        }


        let paymentDate = new Date(body.data.object.created * 1000)
        let user = await this.databaseService.user.findFirst({
            where: { subscriptionId: body.data.object.subscription }
        });
        if(user) {
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
