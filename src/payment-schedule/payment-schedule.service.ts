import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { PaymentScheduleDepositDTO } from './validators/deposit';
import { PaymentScheduleDrawDTO } from './validators/draw';

@Injectable()
export class PaymentScheduleService {

    constructor(private databaseService: DatabaseService) {}
    
    // get payment schedules (deposit + draws)
    async getPaymentSchedules(user: User, companyId: number, jobId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let paymentSchedules = await this.databaseService.paymentSchedule.findFirst({
                    where: {
                        companyId,
                        jobId,
                        isDeleted: false
                    },
                    include: {
                        draws: {
                            where: {
                                isDeleted: false
                            },
                            orderBy: {
                                paymentDate: "asc"
                            }
                        },
                    },
                });
                if (!paymentSchedules) {
                    return { formattedPaymentSchedule: null };
                }
                const formattedPaymentSchedule = {
                    ...paymentSchedules,
                    amount: Number(paymentSchedules.amount).toFixed(2),
                    draws: paymentSchedules.draws.map(draw => ({
                        ...draw,
                        bankFees: Number(draw.bankFees).toFixed(2)
                    }))
                  };
                return { formattedPaymentSchedule }
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

    // insert deposit data
    async insertDeposit(user: User, companyId: number, jobId: number, body: PaymentScheduleDepositDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Check if a payment schedule with the same companyId and jobId already exists
                const existingPaymentSchedule = await this.databaseService.paymentSchedule.findFirst({
                    where: {
                        companyId,
                        jobId,
                    },
                    include: { draws:true }
                });

                if (existingPaymentSchedule) {
                    // Return the existing payment schedule instead of creating a new one
                    return { paymentSchedule: existingPaymentSchedule };
                }

                // Create a new payment schedule if no existing record was found
                let paymentSchedule = await this.databaseService.paymentSchedule.create({
                    data: {
                        companyId,
                        jobId,
                        ...body
                    }
                });

                return { paymentSchedule }
                
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

    // edit deposit data
    async updateDeposit(user: User, companyId: number, jobId: number, id: number, body: PaymentScheduleDepositDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                
                // check non deleted deposite exist or not
                await this.databaseService.paymentSchedule.findFirstOrThrow({
                    where: {
                        id,
                        companyId,
                        jobId,
                        isDeleted: false
                    }
                });

                let paymentSchedule = await this.databaseService.paymentSchedule.update({
                    where: { id },
                    data: {
                        ...body
                    }
                });
    
                return { paymentSchedule };

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

    // insert draw
    async insertDraw(user: User, companyId: number, jobId: number,depoId: number, body: PaymentScheduleDrawDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let newDraw = await this.databaseService.paymentScheduleDraw.create({
                    data: {
                        paymentScheduleId: depoId,
                        ...body
                    }
                });
                
                return { newDraw }
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

    // edit deposit data
    async updateDraw(user: User, companyId: number, jobId: number, depoId: number, drawId: number, body: PaymentScheduleDrawDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                
                // check non deleted draw exist or not
                await this.databaseService.paymentScheduleDraw.findFirstOrThrow({
                    where: {
                        paymentScheduleId: depoId,
                        id: drawId,
                        isDeleted: false
                    }
                });

                let updatedDraw = await this.databaseService.paymentScheduleDraw.update({
                    where: {
                        paymentScheduleId: depoId,
                        id: drawId,
                        isDeleted: false
                    },
                    data: {
                        ...body
                    }
                });

                return { updatedDraw };

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

    // delete draw 
    async deleteDraw(user: User, companyId: number, jobId: number, depoId: number, drawId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                
                // check draw exisit or not
                await this.databaseService.paymentScheduleDraw.findFirstOrThrow({
                    where: {
                        id: drawId,
                        paymentScheduleId: depoId,
                        isDeleted: false
                    }
                });

                // Delete draw
                await this.databaseService.paymentScheduleDraw.update({
                    where: { id: drawId },
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
}
