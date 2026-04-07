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
import { ActivateSubscriptionDTO } from './validators/activate-subscription';
import { PlanType } from '@prisma/client';
import { BuilderPlanTypes } from 'src/core/utils/builder-plan-types';
import { ProfitCalculationType } from 'src/core/utils/company';
import { marginCalculation, markupCalculation } from 'src/core/utils/profit-calculation';
import { formatNumberWithCommas } from 'src/core/utils/formatNumber';

@Injectable()
export class CompanyService {

    private planChangeLocks = new Set<number>();

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
                                accounting: body.PermissionSet.accounting,
                                questionnaire: body.PermissionSet.questionnaire,
                                specifications: body.PermissionSet.specifications,
                                schedule: body.PermissionSet.schedule,
                                selection: body.PermissionSet.selection,
                                proposal: body.PermissionSet.proposal,
                                contractorAndFiles: body.PermissionSet.contractorAndFiles,
                                settings: body.PermissionSet.settings,
                                ytdReport: body.PermissionSet.ytdReport,
                                projectAccess: body.PermissionSet.projectAccess,
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
                if (result.userType == UserTypes.BUILDER && result.stripeCustomerId) {
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
                if (existingUser) {
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
                let res = await this.stripeService.createEmployeeSubscription(builder, body);

                if (res.status) {
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
                                    accounting: body.PermissionSet.accounting,
                                    questionnaire: body.PermissionSet.questionnaire,
                                    specifications: body.PermissionSet.specifications,
                                    schedule: body.PermissionSet.schedule,
                                    selection: body.PermissionSet.selection,
                                    proposal: body.PermissionSet.proposal,
                                    contractorAndFiles: body.PermissionSet.contractorAndFiles,
                                    settings: body.PermissionSet.settings,
                                    ytdReport: body.PermissionSet.ytdReport,
                                    projectAccess: body.PermissionSet.projectAccess,
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
                    this.sendgridService.sendEmailWithTemplate(employee.email, this.config.get('EMPLOYEE_PASSWORD_SET_TEMPLATE_ID'), templateData)
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
                if (employee.subscriptionId) {
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
                let companyData = await this.databaseService.company.findUniqueOrThrow({
                    where: {
                        id: companyId,
                        isActive: true,
                        isDeleted: false
                    }
                });
                let company: any = { ...companyData };
                if (companyData.signNowSubscriptionId) {
                    let res = await this.stripeService.isSignNowCancelled(companyData.signNowSubscriptionId);
                    company.signNowPlanStatus = res.status;
                } else {
                    company.signNowPlanStatus = false;
                }
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
        try {
            const userData = await this.databaseService.user.findUnique({
                where: { id: user.id },
                select: {
                    plan: true,
                    accountStatus: true,
                    cardOnFile: true,
                    subscriptionId: true,
                }
            });

            if (!userData) {
                return null;
            }

            // Fetch live dates from Stripe — these are never stored in DB
            let trialEndsAt: Date | null = null;
            let planStartsAt: Date | null = null;
            let planExpiresAt: Date | null = null;

            if (userData.subscriptionId) {
                try {
                    const stripeInfo = await this.stripeService.getBuilderSubscriptionInfo(user);
                    if (stripeInfo?.builderSubscription) {
                        const sub = stripeInfo.builderSubscription;
                        if (sub.trial_end) trialEndsAt = new Date(sub.trial_end * 1000);
                        // Only expose paid subscription dates when user has an active card/plan
                        if (userData.cardOnFile) {
                            if (sub.current_period_start) planStartsAt = new Date(sub.current_period_start * 1000);
                            if (sub.current_period_end) planExpiresAt = new Date(sub.current_period_end * 1000);
                        }
                    }
                } catch { }
            }

            return {
                builderSubscription: {
                    plan: userData.plan || 'yearly',
                    account_status: userData.accountStatus || 'active',
                    trial_ends_at: trialEndsAt,
                    plan_starts_at: planStartsAt,
                    plan_expires_at: planExpiresAt,
                    card_on_file: userData.cardOnFile,
                    subscription_id: userData.subscriptionId,
                }
            };
        } catch (error) {
            console.log('getBuilderSubscriptionInfo error:', error);
            return null;
        }
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
                const profitCalType = company.profitCalculationType
                // Check is plan updated or not
                let sentPlanUpdateMessage = false;
                let planChangeDates: { current_period_start?: number; current_period_end?: number } = {};

                if (company.planType !== body.planType && user.subscriptionId) {
                    if (this.planChangeLocks.has(user.id)) {
                        throw new BadRequestException('A plan change is already in progress. Please wait.');
                    }
                    this.planChangeLocks.add(user.id);
                    try {
                        let planAmount = 0;
                        const planType = body.planType == BuilderPlanTypes.MONTHLY ? 'month' : 'year';

                        let data = await this.databaseService.seoSettings.findMany();
                        let seoSettings = data[0];
                        body.planType == BuilderPlanTypes.MONTHLY
                            ? planAmount = seoSettings.monthlyPlanAmount.toNumber()
                            : planAmount = seoSettings.yearlyPlanAmount.toNumber()

                        let res = await this.stripeService.changeUserSubscriptionType(user, planAmount * 100, planType);

                        if (res.status) {
                            // Capture subscription dates returned directly from Stripe update
                            if (res.current_period_start) planChangeDates.current_period_start = res.current_period_start;
                            if (res.current_period_end) planChangeDates.current_period_end = res.current_period_end;
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
                            // Update user.plan to keep it in sync with company.planType
                            await this.databaseService.user.update({
                                where: { id: user.id },
                                data: { plan: body.planType }
                            });
                            // Update sign-here plan
                            if (company.signNowSubscriptionId) {
                                let price = 0;
                                planType == 'month'
                                    ? price = seoSettings.signNowMonthlyAmount.toNumber()
                                    : price = seoSettings.signNowYearlyAmount.toNumber()

                                await this.stripeService.changeSignNowSubscriptionPlanType(company, price * 100, planType);
                            }
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
                    } finally {
                        this.planChangeLocks.delete(user.id);
                    }
                }
                const { signNowPlanStatus, ...updatedBody } = body; // Filtering our sign-now plan status
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
                        ...updatedBody
                    }
                });
                // Check is sign now plan status
                let builder = await this.databaseService.user.findUniqueOrThrow({
                    where: {
                        id: user.id,
                        OR: [
                            { userType: UserTypes.BUILDER },
                            { userType: UserTypes.ADMIN },
                        ],
                        isDeleted: false,
                        isActive: true,
                    }
                })
                let data = await this.databaseService.seoSettings.findMany();
                let seoSettings = data[0];
                let signNowResponse = { status: null, message: "" };

                if (body.signNowPlanStatus) {
                    // SignHere = Included
                    let signNowPlanAmount = 0;
                    company.planType == BuilderPlanTypes.MONTHLY
                        ? signNowPlanAmount = seoSettings.signNowMonthlyAmount.toNumber()
                        : signNowPlanAmount = seoSettings.signNowYearlyAmount.toNumber()

                    // Check plan already exist and active
                    if (company.signNowSubscriptionId) {
                        let planInfo = await this.stripeService.isSignNowCancelled(company.signNowSubscriptionId);
                        if (planInfo.status) {
                            return; // Active subscription already exist
                        }
                    }

                    if (builder.cardOnFile && builder.stripeCustomerId) {
                        // User has card on file — create active SignHere subscription immediately
                        let subscriptionRes = await this.stripeService.createBuilderSignNowSubscriptionAfterSignup(company, builder, signNowPlanAmount);
                        if (subscriptionRes.status) {
                            await this.databaseService.company.update({
                                where: { id: companyId },
                                data: {
                                    signNowStripeProductId: subscriptionRes.productId,
                                    signNowSubscriptionId: subscriptionRes.subscriptionId
                                }
                            });

                            signNowResponse.status = true;
                            signNowResponse.message = "Sign here subscription added.";
                        } else {
                            signNowResponse.status = false;
                            signNowResponse.message = "Failed to add sign here subscription.";
                        }
                    } else if (builder.stripeCustomerId && builder.subscriptionId) {
                        // User is on trial (no card) — create SignHere trial subscription
                        const signNowPlanType = company.planType == BuilderPlanTypes.MONTHLY
                            ? BuilderPlanTypes.MONTHLY
                            : BuilderPlanTypes.YEARLY;
                        const signNowRes = await this.stripeService.createBuilderSignNowSubscription(
                            { companyName: company.name, name: builder.name, signNowPlanType },
                            builder.stripeCustomerId,
                            signNowPlanAmount,
                            builder.isDemoUser,
                            builder.subscriptionId
                        );
                        if (signNowRes.status) {
                            await this.databaseService.company.update({
                                where: { id: companyId },
                                data: {
                                    signNowStripeProductId: signNowRes.productId,
                                    signNowSubscriptionId: signNowRes.subscriptionId
                                }
                            });

                            signNowResponse.status = true;
                            signNowResponse.message = "Sign here trial subscription added.";
                        } else {
                            signNowResponse.status = false;
                            signNowResponse.message = "Failed to add sign here subscription.";
                        }
                    } else {
                        // No active subscription (canceled) or no Stripe customer — SignHere will be set up on reactivation
                        signNowResponse.status = true;
                        signNowResponse.message = "SignHere will be included when the subscription is reactivated.";
                    }
                }
                else {
                    // SignHere = Not Included — cancel if exists
                    const signHereSubId = company.signNowSubscriptionId;
                    if (signHereSubId) {
                        let planInfo = await this.stripeService.isSignNowCancelled(signHereSubId);
                        if (planInfo.status) {
                            // Cancel subscription
                            let status = await this.stripeService.removeSubscription(signHereSubId);
                            if (status) {

                                await this.databaseService.company.update({
                                    where: { id: companyId },
                                    data: {
                                        signNowSubscriptionId: null,
                                        signNowStripeProductId: null,
                                    }
                                });
                                signNowResponse.status = true;
                                signNowResponse.message = "Sign here subscription cancelled.";
                            } else {
                                signNowResponse.status = false;
                                signNowResponse.message = "Failed to cancel sign here subscription.";
                            }
                        }
                    }
                }


                return { company, isPlanChanged: sentPlanUpdateMessage, planChangeDates, signNowResponse }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error)
            if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException({
                error: "An unexpected error occured."
            });
        }
    }

    // Get default payment method from stripe
    async getDefaultPaymentMethod(user: User, companyId: number) {
        if (user.stripeCustomerId) {
            return this.stripeService.getDefaultPaymentMethod(user.stripeCustomerId);
        }
        else {
            return null;
        }
    }

    // Set default payment method in stripe
    async setDefaultPaymentMethod(user: User, body: PaymentMethodDTO) {
        if (user.stripeCustomerId) {
            const result = await this.stripeService.setDefaultPaymentMethod(user.stripeCustomerId, body.paymentMethodId);

            // Resume paused Stripe subscription if it exists
            if (user.subscriptionId) {
                await this.stripeService.resumeSubscription(user.subscriptionId, body.paymentMethodId);
            }

            // After successful card save, activate account and set plan dates
            const now = new Date();
            const planExpiresAt = new Date(now);
            planExpiresAt.setFullYear(planExpiresAt.getFullYear() + 1);

            return { ...result, card_on_file: true, account_status: 'active' };
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
            if (res.status) {
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
            if (res.status) {
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
            // Remove main subscription from stripe
            if (builder.subscriptionId) {
                const isDeleted = await this.stripeService.removeSubscription(builder.subscriptionId);

            }
            // Cancel sign-now subscription from company table
            let company = await this.databaseService.company.findFirst({
                where: { id: user.companyId, isDeleted: false }
            });
            if (company && company.signNowSubscriptionId) {
                try {
                    await this.stripeService.removeSubscription(company.signNowSubscriptionId);
                    // To be removed later
                    await this.databaseService.company.update({
                        where: { id: user.companyId, isDeleted: false },
                        data: {
                            signNowStripeProductId: null,
                            signNowSubscriptionId: null
                        }
                    })
                } catch (error) {
                    console.log(error)
                }
            }
            // Cancel ALL employee subscriptions regardless of their individual status
            let employees = await this.databaseService.user.findMany({
                where: {
                    isDeleted: false,
                    companyId: user.companyId,
                    userType: UserTypes.EMPLOYEE,
                }
            });
            if (employees.length > 0) {
                for (const employee of employees) {
                    if (employee.subscriptionId) {
                        await this.stripeService.removeSubscription(employee.subscriptionId);
                    }
                }
                // Immediately deactivate all employees in DB — don't wait for webhooks
                await this.databaseService.user.updateMany({
                    where: {
                        companyId: user.companyId,
                        userType: UserTypes.EMPLOYEE,
                        isDeleted: false,
                    },
                    data: { accountStatus: 'inactive', subscriptionId: null, cardOnFile: false }
                });
            }
            if (company) {
                await this.sendMailToAdmin(company, builder);
            }
            return { message: ResponseMessages.SUCCESSFUL, account_status: 'inactive' }
        } catch (error) {
            console.log(error)
            throw new InternalServerErrorException({
                error: "An unexpected error occured.",
                errorDetails: error.message
            })
        }
    }

    async getSignNowPlanInfo(user: User, companyId: number) {
        try {
            let company = await this.databaseService.company.findUniqueOrThrow({
                where: { id: companyId, isDeleted: false }
            });
            let data = await this.databaseService.seoSettings.findMany();
            let seoSettings = data[0];
            const { signNowMonthlyAmount, signNowYearlyAmount } = seoSettings;
            return { signNowPlanPriceInfo: { signNowMonthlyAmount, signNowYearlyAmount }, isSignNowCancelled: false }
        } catch (error) {
            console.log(error);
        }
    }

    private async sendMailToAdmin(company: any, builder: any) {
        const admins = await this.databaseService.user.findMany({
            where: {
                userType: UserTypes.ADMIN,
                isDeleted: false,
            }
        });

        let templateData = {
            admin: "",
            companyName: company.name ?? "",
            email: builder.email ?? "",
            address: company.address ?? "",
            zipCode: company.zipcode ?? "",
            phoneNumber: company.phoneNumber ?? "",
            planType: company.planType ?? "",
            planAmount: formatNumberWithCommas(company.planAmount) ?? "",
        }

        if (admins.length > 0) {
            const emailPromises = admins.map(admin => {
                templateData.admin = admin.name;
                this.sendgridService.sendEmailWithTemplate(
                    admin.email,
                    this.config.get('CLIENT_PLAN_CANCELLATION_NOTIFICATION_TEMPLATE_ID'),
                    templateData,
                );
            });

            await Promise.all(emailPromises);
        }
    }

    async updateCompanySalesTaxRate(user: User, companyId: number, body: { salesTaxRate: number }) {
        try {
            // Check company exist or not
            await this.databaseService.company.findUniqueOrThrow({
                where: { id: companyId, isDeleted: false }
            });

            // Update company sales tax rate
            await this.databaseService.company.update({
                where: { id: companyId },
                data: {
                    saleTaxRate: body.salesTaxRate
                }
            });
            return { message: ResponseMessages.SUCCESSFUL }

        } catch (error) {
            console.log(error);
            throw new InternalServerErrorException({
                error: "An unexpected error occured.",
                errorDetails: error.message
            })
        }
    }

    // Activate subscription: resume paused subscriptions or create new ones after cancellation
    async activateSubscription(user: User, companyId: number, body: ActivateSubscriptionDTO) {
        try {
            if (user.userType !== UserTypes.BUILDER && user.userType !== UserTypes.ADMIN) {
                throw new ForbiddenException("Action Not Allowed");
            }
            if (user.userType === UserTypes.BUILDER && user.companyId !== companyId) {
                throw new ForbiddenException("Action Not Allowed");
            }

            const company = await this.databaseService.company.findUniqueOrThrow({
                where: { id: companyId, isActive: true, isDeleted: false }
            });

            // Get plan pricing from DB
            const seoData = await this.databaseService.seoSettings.findMany();
            const seoSettings = seoData[0];
            const planAmount = body.planType === PlanType.MONTHLY
                ? seoSettings.monthlyPlanAmount.toNumber()
                : seoSettings.yearlyPlanAmount.toNumber();
            const signNowPlanAmount = body.planType === PlanType.MONTHLY
                ? seoSettings.signNowMonthlyAmount.toNumber()
                : seoSettings.signNowYearlyAmount.toNumber();

            // Strip referral promo codes when plan is Monthly — they are yearly-only
            const yearlyOnlyCodes = (this.config.get<string>('VALID_REFERRAL_CODES') || '')
                .split(',')
                .map(c => c.trim().toUpperCase())
                .filter(Boolean);
            if (
                body.promoCode &&
                yearlyOnlyCodes.includes(body.promoCode.toUpperCase()) &&
                body.planType === PlanType.MONTHLY
            ) {
                body.promoCode = undefined;
            }

            const res = await this.stripeService.activateSubscription(
                user,
                body,
                body.signHere === false ? null : company.signNowSubscriptionId,
                planAmount,
                body.signHere === false ? 0 : signNowPlanAmount,
            );

            // Update user record with new subscription dates and status
            const now = new Date();
            const planExpiresAt = new Date(now);
            if (body.planType === PlanType.MONTHLY) {
                planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);
            } else {
                planExpiresAt.setFullYear(planExpiresAt.getFullYear() + 1);
            }

            // Update company with new SignHere subscription if created
            if (res.isNewSubscription && res.signHereSubscriptionId) {
                await this.databaseService.company.update({
                    where: { id: companyId },
                    data: {
                        signNowSubscriptionId: res.signHereSubscriptionId,
                        signNowStripeProductId: res.signHereProductId,
                        planType: body.planType === PlanType.MONTHLY ? 'MONTHLY' : 'YEARLY',
                    },
                });
            }

            return {
                status: true,
                message: res.isNewSubscription
                    ? 'Subscription reactivated successfully'
                    : 'Subscription activated successfully',
                account_status: 'active',
                plan: body.planType,
                plan_starts_at: now,
                plan_expires_at: planExpiresAt,
            };

        } catch (error) {
            console.log('activateSubscription error:', error);
            if (error instanceof ForbiddenException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException({
                error: 'An unexpected error occurred.',
                errorDetails: error.message,
            });
        }
    }

    async getValidReferralCode(user: User, companyId: number) {
        try {
            if (user.userType !== UserTypes.BUILDER && user.userType !== UserTypes.ADMIN) {
                throw new ForbiddenException("Action Not Allowed");
            }
            if (user.userType === UserTypes.BUILDER && user.companyId !== companyId) {
                throw new ForbiddenException("Action Not Allowed");
            }

            const referralCode = await this.databaseService.user.findFirst({
                where: {
                    companyId,
                    id: user.id,
                    isActive: true,
                    isDeleted: false,
                    referralCode: {
                        not: null,
                    }
                },
                select: {
                    id: true,
                    referralCode: true,
                    referralCodeApplied: true,
                }
            });

            if (referralCode && referralCode.referralCode && !referralCode.referralCodeApplied) {
                const response = await this.stripeService.getPromoCodeInfo(referralCode.referralCode);

                if (!response.status) {
                    return false;
                }
                return {
                    success: true,
                    name: response.info.name,
                    discount: response.info.discount,
                    promoCode: response.info.promo_code_id,
                    couponId: response.info.coupon_id,
                    duration: response.info.duration,
                    message: response.message,
                };
            }

        } catch (error) {
            console.log('referral code error:', error);
            if (error instanceof ForbiddenException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException({
                error: 'An unexpected error occurred.',
                errorDetails: error.message,
            });
        }
    }
}
