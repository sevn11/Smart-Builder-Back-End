import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';
import { SignUpDTO, SignInDTO, ForgotPasswordDTO, PasswordResetDTO, SetPasswordDTO } from './validators';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, HelperFunctions, ResponseMessages, UserTypes } from 'src/core/utils';
import { SendgridService } from 'src/core/services';
import { ConfigService } from '@nestjs/config';
import { StripeService } from 'src/core/services/stripe.service';
import { BuilderPlanTypes } from 'src/core/utils/builder-plan-types';


@Injectable()
export class AuthService {
    constructor(
        private databaseService: DatabaseService,
        private jwtService: JwtService,
        private sendgridService: SendgridService,
        private stripeService: StripeService,
        private config: ConfigService) {
    }

    async signup(body: SignUpDTO) {
        try {
            let existingUser = await this.databaseService.user.findUnique({
                where: {
                    email: body.email,
                    isActive: true,
                    isDeleted: false
                }
            });
            if (existingUser) {
                throw new BadRequestException();
            }

            let data = await this.databaseService.seoSettings.findMany();
            let seoSettings = data[0];
            
            let planAmount = 0;
            body.planType == BuilderPlanTypes.MONTHLY 
                ? planAmount = seoSettings.monthlyPlanAmount.toNumber() 
                : planAmount = seoSettings.yearlyPlanAmount.toNumber()

            if(data) {
                // Create new customer and add card details inside stripe
                let response = await this.stripeService.createBuilderSubscription(body, planAmount);
                if(response.status) {
                    let signNowSubscriptionResponse = null;
                    let signNowSubStatus = false;
                    // Create a SignNow subscription if the builder chooses a plan
                    if (body.signNowPlanType && Object.values(BuilderPlanTypes).includes(body.signNowPlanType)) {
                        let signNowPlanAmount = 0;
                        body.signNowPlanType == BuilderPlanTypes.MONTHLY
                            ? signNowPlanAmount = seoSettings.signNowMonthlyAmount.toNumber()
                            : signNowPlanAmount = seoSettings.signNowYearlyAmount.toNumber()
    
                        signNowSubscriptionResponse = await this.stripeService.createBuilderSignNowSubscription(body, response.stripeCustomerId, signNowPlanAmount);
                        if (signNowSubscriptionResponse.status) {
                            signNowSubStatus = true
                        }
                    }
                    const hash = await argon.hash(body.password);
                    const user = await this.databaseService.user.create({
                        data: {
                            email: body.email.toLowerCase(),
                            hash,
                            name: body.name,
                            userType: UserTypes.BUILDER,
                            tosAcceptanceTime: new Date().toISOString(),
                            isTosAccepted: true,
                            tosVersion: HelperFunctions.getTosVersion(),
                            stripeCustomerId: response.stripeCustomerId,
                            productId: response.productId,
                            subscriptionId: response.subscriptionId,
                            company: {
                                create: {
                                    name: body.companyName,
                                    address: body.address,
                                    phoneNumber: body.phoneNumber,
                                    planType: body.planType,
                                    planAmount,
                                    extraFee: seoSettings.additionalEmployeeFee,
                                    signNowSubscriptionId: signNowSubscriptionResponse?.subscriptionId || null,
                                    signNowStripeProductId: signNowSubscriptionResponse?.productId || null,
                                }
                            },
                            PermissionSet: {
                                create: {
                                    fullAccess: true,
                                    viewOnly: false
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
                                    userId: true,
                                    isDeleted: true,
                                }
                            }
                        }
                    });
                    const payload = { sub: user.id, email: user.email, companyId: user.company.id };
                    const access_token = await this.jwtService.signAsync(payload);
                    return { status: true, user, access_token, signNowSubStatus };
                }
                else {
                    return response;
                }
            } else {
                throw new InternalServerErrorException()
            }
        } catch (ex) {
            // Database Exceptions
            if(ex instanceof BadRequestException) {
                throw new BadRequestException(ResponseMessages.UNIQUE_EMAIL_ERROR);
            }
            throw new InternalServerErrorException()
        }
    }

    async login(body: SignInDTO) {
        console.log(body);
        try {
            const user = await this.databaseService.user.findUniqueOrThrow({
                where: {
                    email: body.email.toLowerCase(),
                    isActive: true,
                    isDeleted: false
                },
                omit: {
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
                            userId: true,
                            isDeleted: true,
                        }
                    }
                }
            });
            if (!user.isActive || !user.company.isActive) {
                throw new ForbiddenException(ResponseMessages.ACCOUNT_SUSPENDED);
            }
            if (await argon.verify(user.hash, body.password)) {
                delete user.hash;
                const payload = { sub: user.id, email: user.email, companyId: user.company.id };
                const access_token = await this.jwtService.signAsync(payload);
                // save token to users table
                await this.databaseService.user.update({
                    where: { id: user.id },
                    data: { activeAuthToken: access_token }
                });
                return { user, access_token };
            } else {
                throw new NotFoundException(ResponseMessages.INVALID_CREDENTIALS);
            }
        } catch (ex) {
            // Database Exceptions
            console.log(ex);
            if (ex instanceof PrismaClientKnownRequestError) {
                if (ex.code == PrismaErrorCodes.NOT_FOUND)
                    throw new NotFoundException(ResponseMessages.INVALID_CREDENTIALS);
            } else if (ex instanceof NotFoundException) {
                throw ex;
            } else if (ex instanceof ForbiddenException) {
                throw ex;
            } else {
                throw new InternalServerErrorException();
            }

        }


    }

    async forgotMyPassword(body: ForgotPasswordDTO) {

        try {
            // Get if email exist
            let user = await this.databaseService.user.findUniqueOrThrow({
                where: {
                    email: body.email.toLowerCase(),
                    isActive: true,
                    isDeleted: false
                }
            });
            // Generate Code
            let code = HelperFunctions.generateCode();
            await this.databaseService.user.update({
                where: {
                    id: user.id,
                    isActive: true,
                    isDeleted: false,
                },
                data: {
                    passwordResetCode: code
                }
            })
            // Todo: Send Email
            const templateData = {
                name: user.name,
                reset_link: `${this.config.get('FRONTEND_BASEURL')}/auth/reset-password?code=${code}`
            }
            this.sendgridService.sendEmailWithTemplate(user.email, this.config.get('USER_PASSWORD_RESET_TEMPLATE_ID'), templateData);
            // send Responsea
            return { message: ResponseMessages.PASSWORD_RESET_CODE_SENT }

        } catch (error) {
            // Database Exceptions
            console.log(error);
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    return { message: ResponseMessages.PASSWORD_RESET_CODE_SENT }
                throw new InternalServerErrorException();
            } else {
                throw new InternalServerErrorException();
            }
        }
    }

    async resetMyPassword(code: number, body: PasswordResetDTO) {
        try {
            let user = await this.databaseService.user.findFirstOrThrow({
                where: {
                    passwordResetCode: code,
                    isActive: true,
                    isDeleted: false
                }
            });
            let hash = await argon.hash(body.password);
            await this.databaseService.user.update({
                where: {
                    id: user.id,
                    isActive: true,
                    isDeleted: false
                },
                data: {
                    hash: hash,
                    passwordResetCode: null
                }
            })
            return { message: ResponseMessages.SUCCESSFUL }
        } catch (error) {
            console.log(error)
            throw new BadRequestException({ message: ResponseMessages.INVALID_RESET_CODE })
        }

    }

    async completeUserProfile(token: string, body: SetPasswordDTO) {
        try {
            let user = await this.databaseService.user.findFirstOrThrow({
                where: {
                    invitationToken: token,
                    isActive: true,
                    isDeleted: false
                },
                omit: {
                    hash: true,
                    invitationToken: true,
                    passwordResetCode: true,
                    isDeleted: true
                },
            });
            let hash = await argon.hash(body.password);
            let updatedUser = await this.databaseService.user.update({
                where: {
                    id: user.id,
                    isActive: true,
                    isDeleted: false
                },
                data: {
                    hash: hash,
                    invitationToken: null
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
                        },
                    },
                    PermissionSet: {
                        omit: {
                            userId: true,
                            isDeleted: true,
                        }
                    }
                }
            });
            const payload = { sub: user.id, email: user.email, companyId: updatedUser.company.id };
            const access_token = await this.jwtService.signAsync(payload);
            return { message: ResponseMessages.SUCCESSFUL, user, access_token }
        } catch (error) {
            console.log(error)
            throw new BadRequestException({ message: ResponseMessages.INVALID_INVITE_TOKEN })
        }

    }
}
