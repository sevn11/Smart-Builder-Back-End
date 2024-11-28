import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { AddUserDTO, UpdateCompanyDTO, UpdateUserDTO, UploadLogoDTO, ChangeEmailDTO } from './validators';
import { HelperFunctions, PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';
import { AWSService, SendgridService } from 'src/core/services';
import { StripeService } from 'src/core/services/stripe.service';
import { PaymentMethodDTO } from './validators/payment-method';
import { BuilderPlanTypes } from 'src/core/utils/builder-plan-types';

@Injectable()
export class CompanyService {

    constructor(
        private databaseService: DatabaseService,
        private readonly config: ConfigService,
        private sendgridService: SendgridService,
        private awsService: AWSService,
        private stripeService: StripeService
    ) {
    }

    async getUserList(user: User, companyId: number) {
        try {
            if (user.userType == UserTypes.BUILDER || user.userType === UserTypes.ADMIN) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let userList = await this.databaseService.user.findMany({
                    where: {
                        companyId,
                        isDeleted: false
                    },
                    omit: {
                        hash: true,
                        invitationToken: true,
                        passwordResetCode: true,
                        isDeleted: true
                    },
                    include: {
                        company: {
                            omit: {
                                isDeleted: true
                            }
                        },
                        PermissionSet: {
                            omit: {
                                userId: true
                            }
                        },
                        PaymentLog: {
                            select: {
                                id: true,
                                userId: true,
                                status: true,
                                paymentDate: true,
                                createdAt: true,
                                updatedAt: true,
                            },
                            where: {
                                status: {
                                    not: 'processing'
                                }
                            },
                            orderBy: {
                                paymentDate: 'desc'
                            },
                            take: 1
                        }
                    }
                }
                );
                return { users: userList }
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

    async updateUser(user: User, companyId: number, userId: number, body: UpdateUserDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let result = null;
                result = await this.databaseService.user.findFirstOrThrow({
                    where: {
                        id: userId,
                        isActive: true,
                        companyId: companyId,
                        isDeleted: false
                    }
                });
                result = await this.databaseService.user.update({
                    where: {
                        id: userId,
                        companyId: companyId,
                        isDeleted: false
                    },
                    data: {
                        name: body.name,
                        email: body.email,
                        PermissionSet: {
                            update: {
                                fullAccess: body.PermissionSet.fullAccess,
                                questionnaire: body.PermissionSet.questionnaire,
                                specifications: body.PermissionSet.specifications,
                                schedule: body.PermissionSet.schedule,
                                selection: body.PermissionSet.selection,
                                viewOnly: body.PermissionSet.viewOnly
                            }
                        }
                    },
                    omit: {
                        hash: true,
                        invitationToken: true,
                        passwordResetCode: true,
                        isDeleted: true,
                    },
                    include: {
                        company: {
                            omit: {
                                isDeleted: true
                            }
                        },
                        PermissionSet: {
                            omit: {
                                userId: true
                            }
                        }
                    }
                });
                if(result.userType == UserTypes.BUILDER && result.stripeCustomerId) {
                    await this.stripeService.updateCustomerEmail(result);
                } 
                return { message: ResponseMessages.SUCCESSFUL, result }
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

    async changeUserEmail(user: User, companyId: number, userId: number, body: ChangeEmailDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let employee = null;
                employee = await this.databaseService.user.findFirstOrThrow({
                    where: {
                        id: userId,
                        isActive: true,
                        companyId: companyId,
                        isDeleted: false
                    }
                });
                employee = await this.databaseService.user.update({
                    where: {
                        id: userId,
                        isActive: true,
                        companyId: companyId,
                        isDeleted: false
                    },
                    data: {
                        email: body.email,
                    },
                    omit: {
                        hash: true,
                        invitationToken: true,
                        passwordResetCode: true,
                        isDeleted: true,
                    },
                    include: {
                        company: {
                            omit: {
                                isDeleted: true
                            }
                        },
                        PermissionSet: {
                            omit: {
                                userId: true
                            }
                        }
                    }
                });
                return { message: ResponseMessages.SUCCESSFUL, employee }
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

    async addUsers(user: User, companyId: number, body: AddUserDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isActive: true,
                        isDeleted: false
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Check user already exist
                let existingUser = await this.databaseService.user.findFirst({
                    where: {
                        email: body.email
                    }
                });
                if(existingUser) {
                    throw new ForbiddenException("User alredy exist!");
                }

                // Charge extra fee amount for adding new employee
                let response = {
                    paymentStatus: false,
                    payementMessage: "",
                    userMessage: "",
                    employee: null,
                }
                let builder = await this.databaseService.user.findFirst({
                    where: { id: user.id },
                    include: {
                        company: true
                    }
                });
                let res =  await this.stripeService.createEmployeeSubscription(builder, body);
                
                if(res.status) {
                    // After successfull payment insert employee
                    const invitationToken = HelperFunctions.generateRandomString(16);
                    const employee = await this.databaseService.user.create({
                        data: {
                            email: body.email.toLowerCase(),
                            name: body.name,
                            userType: UserTypes.EMPLOYEE,
                            companyId: companyId,
                            invitationToken, // Generate Invitation Token
                            PermissionSet: {
                                create: {
                                    fullAccess: body.PermissionSet.fullAccess,
                                    questionnaire: body.PermissionSet.questionnaire,
                                    specifications: body.PermissionSet.specifications,
                                    schedule: body.PermissionSet.schedule,
                                    selection: body.PermissionSet.selection,
                                    viewOnly: body.PermissionSet.viewOnly
                                }
                            },
                            productId: res.productId,
                            subscriptionId: res.subscriptionId,
                            EmployeeDetails: {
                                create: {
                                    address: body.address,
                                    phoneNumber: body.phoneNumber
                                }
                            }
                        },
                        omit: {
                            hash: true,
                            invitationToken: true,
                            passwordResetCode: true,
                            isDeleted: true
                        },
                        include: {
                            company: {
                                omit: {
                                    isDeleted: true
                                }
                            },
                            PermissionSet: {
                                omit: {
                                    userId: true
                                }
                            },
                            PaymentLog: {
                                select: {
                                    id: true,
                                    userId: true,
                                    status: true,
                                    paymentDate: true,
                                    createdAt: true,
                                    updatedAt: true,
                                },
                                where: {
                                    status: {
                                        not: 'processing'
                                    }
                                },
                                orderBy: {
                                    paymentDate: 'desc'
                                },
                                take: 1
                            }
                        }
                    });

                    response.employee = employee
                    response.paymentStatus = true;
                    response.payementMessage = res.message;
                    response.userMessage = "User Invitation sent";
                    //  Send Email
                    const templateData = {
                        user_name: employee.name,
                        company_name: employee.company.name,
                        password_link: `${this.config.get("FRONTEND_BASEURL")}/auth/create-password?token=${invitationToken}`
                    }
                    // this.sendgridService.sendEmailWithTemplate(employee.email, this.config.get('EMPLOYEE_PASSWORD_SET_TEMPLATE_ID'), templateData)
                } else {
                    response.paymentStatus = false;
                    response.payementMessage = res.message;
                    response.userMessage = "User not created";
                }

                return response;
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.UNIQUE_EMAIL_ERROR);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            } else {
                throw new InternalServerErrorException();
            }
        }
    }

    async removeUser(user: User, companyId: number, userId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let employee = await this.databaseService.user.findFirstOrThrow({
                    where: {
                        id: userId,
                        isActive: true,
                        companyId: companyId,
                        isDeleted: false
                    }
                });
                // Remove subscription from stripe
                if(employee.subscriptionId) {
                    await this.stripeService.removeSubscription(employee.subscriptionId);
                }
                await this.databaseService.user.delete({
                    where: {
                        id: userId
                    }
                })
                return { "message": ResponseMessages.USER_REMOVED }

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

    async getCompanyDetails(user: User, companyId: number) {
        try {
            if (user.companyId === companyId || user.userType === UserTypes.ADMIN) {
                let company = await this.databaseService.company.findUniqueOrThrow({
                    where: {
                        id: companyId,
                        isActive: true,
                        isDeleted: false
                    }
                });
                return { company }
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

    async getBuilderSubscriptionInfo(user: User) {
        return this.stripeService.getBuilderSubscriptionInfo(user)
    }

    async getUploadLogoSignedUrl(user: User, companyId: number, body: UploadLogoDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isActive: true,
                        isDeleted: false
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let key: string = `companies/${companyId}/logos/${body.filename}`;
                let url = await this.awsService.generateS3PresignedUrl(key, body.contentType);
                return { url, message: ResponseMessages.SUCCESSFUL };

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error)
            if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    async updateCompany(user: User, companyId: number, body: UpdateCompanyDTO) {

        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isActive: true,
                        isDeleted: false
                    },
                    omit: {
                        isDeleted: true
                    },
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                // Check is plan updated or not
                let sentPlanUpdateMessage = false;
                if(company.planType !== body.planType) {
                    let planAmount = 0;
                    const planType = body.planType == BuilderPlanTypes.MONTHLY ? 'month' : 'year';

                    let data = await this.databaseService.seoSettings.findMany();
                    let seoSettings = data[0];
                    body.planType == BuilderPlanTypes.MONTHLY 
                        ? planAmount = seoSettings.monthlyPlanAmount.toNumber() 
                        : planAmount = seoSettings.yearlyPlanAmount.toNumber()

                    let res = await this.stripeService.changeUserSubscriptionType(user, planAmount * 100, planType);

                    if(res.status) {
                        // Update company with new price
                        sentPlanUpdateMessage = true;
                        company = await this.databaseService.company.update({
                            where: {
                                id: companyId,
                                isActive: true,
                                isDeleted: false
                            },
                            omit: {
                                isDeleted: true
                            },
                            data: {
                                planAmount
                            }
                        });
                        // Update plan for each employee under builder
                        let employees = await this.databaseService.user.findMany({
                            where: {
                                isActive: true,
                                isDeleted: false,
                                companyId: user.companyId,
                                userType: UserTypes.EMPLOYEE
                            }
                        });
                        if (employees.length > 0) {
                            let builder = await this.databaseService.user.findFirst({
                                where: { id: user.id },
                                include: { company: true }
                            })
                            let feeAmount = builder.company.extraFee.toNumber() * 100;
                            if (planType === 'year') {
                                feeAmount *= 12;
                            }
                            for (const employee of employees) {
                                await this.stripeService.changeUserSubscriptionType(user, feeAmount, planType, employee);
                            }
                        }
                    }
                }
                company = await this.databaseService.company.update({
                    where: {
                        id: companyId,
                        isActive: true,
                        isDeleted: false
                    },
                    omit: {
                        isDeleted: true
                    },
                    data: {
                        ...body
                    }
                });
                return { company, isPlanChanged:sentPlanUpdateMessage  }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error)
            if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // Get default payment method from stripe
    async getDefaultPaymentMethod(user: User, companyId: number) {
        if(user.stripeCustomerId) {
            return this.stripeService.getDefaultPaymentMethod(user.stripeCustomerId);
        }
        else {
            return null;
        }
    }

    // Set default payment method in stripe
    async setDefaultPaymentMethod(user: User, body: PaymentMethodDTO) {
        if(user.stripeCustomerId) {
            return this.stripeService.setDefaultPaymentMethod(user.stripeCustomerId, body.paymentMethodId);
        }
        throw new InternalServerErrorException();
    }

    // Get all transactions of builder
    async getTransactions(user: User, companyId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const users = await this.databaseService.user.findMany({
                    where: { companyId: companyId, isActive: true },
                    select: { id: true },
                });
            
                const usersIds = users.map(users => users.id);

                const transactionLogs = await this.databaseService.paymentLog.findMany({
                    where: { userId: { in: usersIds } },
                    orderBy: { paymentDate: 'desc' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    },
                    omit: {
                        response: true
                    }
                });
                let totalCount = transactionLogs.length;

                return { transactionLogs, totalCount }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error)
            if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // Get all transactions of builder
    async retryPayment(user: User, paymentLogId: number, body: PaymentMethodDTO) {
        try {
            let paymentLog = await this.databaseService.paymentLog.findFirstOrThrow({
                where: {
                    id: paymentLogId
                }
            });
            let res = await this.stripeService.retryFailedPayment(user, paymentLog.paymentId, body.paymentMethodId);
            if(res.status) {
                await this.databaseService.paymentLog.update({
                    where: {
                        id: paymentLogId
                    },
                    data: {
                        status: 'successful'
                    }
                })
            }
            return { status: res.status, message: res.message }
        } catch (error) {
            console.log(error)
            throw new InternalServerErrorException();
        }
    }

    // Function to renew subscription of an employee
    async renewEmployeeSubscription(user: User, employeeId: number, body: PaymentMethodDTO) {
        try {
            const employee = await this.databaseService.user.findFirstOrThrow({
                where: {
                    id: employeeId
                }
            });
            let res = await this.stripeService.renewEmployeeSubscription(user, employee, body.paymentMethodId);
            if(res.status) {
                await this.databaseService.user.update({
                    where: { id: employeeId },
                    data: {
                        subscriptionId: res.subscriptionId,
                        isActive: true
                    }
                });
            }
            return { status: res.status, message: res.message }
        } catch (error) {
            console.log(error)
            throw new InternalServerErrorException();
        }
    }

    // Fn to cancel builder subscription along with all employee scubscriptions
    async cancelBuilderSubscription(user: User) {
        try {
            let builder = await this.databaseService.user.findFirstOrThrow({
                where: {
                    id: user.id,
                    userType: UserTypes.BUILDER
                }
            });
            // Remove subscription from stripe
            if(builder.subscriptionId) {
                await this.stripeService.removeSubscription(builder.subscriptionId);
            }
            // Cancel employee subscription
            let employees = await this.databaseService.user.findMany({
                where: {
                    isActive: true,
                    isDeleted: false,
                    companyId: user.companyId,
                    userType: UserTypes.EMPLOYEE
                }
            });
            if (employees.length > 0) {
                for (const employee of employees) {
                    if(employee.subscriptionId) {
                        await this.stripeService.removeSubscription(employee.subscriptionId);
                    }
                }
            }
            return { message: ResponseMessages.SUCCESSFUL }
        } catch (error) {
            console.log(error)
            throw new InternalServerErrorException({
                error: "An unexpected error occured.",
                errorDetails: error.message
            })
        }
    }
}
