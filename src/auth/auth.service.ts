import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';
import { SignUpDTO, SignInDTO, ForgotPasswordDTO, PasswordResetDTO, SetPasswordDTO } from './validators';
import * as argon from 'argon2';
import { DefaultArgs, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, HelperFunctions, ResponseMessages, UserTypes } from 'src/core/utils';
import { SendgridService } from 'src/core/services';
import { ConfigService } from '@nestjs/config';
import { StripeService } from 'src/core/services/stripe.service';
import { BuilderPlanTypes } from 'src/core/utils/builder-plan-types';
import { Prisma, PrismaClient, User } from '@prisma/client';


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
                let promoCode: string;
                if(body.promoCode) {
                    promoCode = body.promoCode;
                }
                let response = await this.stripeService.createBuilderSubscription(body, planAmount, promoCode);
                if(response.status) {
                    let signNowSubscriptionResponse = null;
                    let signNowSubStatus = true;
                    // Create a SignNow subscription if the builder chooses a plan
                    if (body.signNowPlanType && Object.values(BuilderPlanTypes).includes(body.signNowPlanType)) {
                        let signNowPlanAmount = 0;
                        body.signNowPlanType == BuilderPlanTypes.MONTHLY
                            ? signNowPlanAmount = seoSettings.signNowMonthlyAmount.toNumber()
                            : signNowPlanAmount = seoSettings.signNowYearlyAmount.toNumber()
    
                        signNowSubscriptionResponse = await this.stripeService.createBuilderSignNowSubscription(body, response.stripeCustomerId, signNowPlanAmount);
                        if (!signNowSubscriptionResponse.status) {
                            signNowSubStatus = false
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
                                    zipcode: body.zipcode,
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

                    // Copy master templates to builder
                    if (user.companyId) {
                        await this.prepareBuilderTemplateData(user);
                    }

                    return { status: true, user, access_token, signNowSubStatus };
                }
                else {
                    return response;
                }
            } else {
                throw new InternalServerErrorException()
            }
        } catch (ex) {
            console.log(ex)
            // Database Exceptions
            if(ex instanceof BadRequestException) {
                throw new BadRequestException(ResponseMessages.UNIQUE_EMAIL_ERROR);
            }
            throw new InternalServerErrorException({
                statusCode: 500,
                message: ex,
                error: 'InternalServerError',
            });
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
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
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

    // Copying all master templates to new builder
    private async prepareBuilderTemplateData (user: any) {
        // Get all master templates
        let masterTemplates = await this.databaseService.masterQuestionnaireTemplate.findMany({
            where: { isDeleted: false }
        });

        if (masterTemplates.length == 0) return;

        for (const mTemplate of masterTemplates) {
            // Copy template info to builder templates table
            const builderProjectEstimatorTemplate = await this.databaseService.projectEstimatorTemplate.create({
                data: {
                    templateName: mTemplate.name,
                    companyId: user.company.id
                }
            });
            const builderTemplate = await this.databaseService.questionnaireTemplate.create({
                data: {
                    name: mTemplate.name,
                    companyId: user.company.id,
                    isCompanyTemplate: true,
                    templateType: mTemplate.templateType,
                    projectEstimatorTemplateId: builderProjectEstimatorTemplate.id
                }
            });

            // Handle questionnaire template and selection template
            if (mTemplate.id && builderTemplate.id) {
                await this.handleBuilderQuestionnaireTemplate(mTemplate.id, builderTemplate.id, user);
            }

            // Handle project estimator template
            if (
                mTemplate.masterProjectEstimatorTemplateId && 
                builderTemplate.id && 
                builderProjectEstimatorTemplate.id
            ) {
                await this.handleBuilderEstimatorTemplate(mTemplate.id, builderProjectEstimatorTemplate.id, user);
            }

        }
    }

    // Copy questionnaire template and selection template to builder from admin
    private async handleBuilderQuestionnaireTemplate (mTemplateId: number, builderTemplateId: number, user: any) {
        const mQuestionnaireTemplate = await this.databaseService.masterQuestionnaireTemplate.findUnique({
            where: { id: mTemplateId, isDeleted: false },
            include: {
                masterTemplateCategories: {
                    where: { masterQuestionnaireTemplateId: mTemplateId, isDeleted: false },
                    orderBy: { id: "asc" },
                    include: { masterQuestions: { where: { isDeleted: false}, orderBy: { id: "asc" } } }
                }
            }
        });
        // in case if not categories.
        if (!mQuestionnaireTemplate || mQuestionnaireTemplate.masterTemplateCategories.length === 0) return;

        // Categories
        const mCategories = mQuestionnaireTemplate.masterTemplateCategories;

        await this.databaseService.$transaction(async (tx) => {
            await Promise.all(mCategories.map(async (mCategory) => {
                // Create builder categories
                const category = await tx.category.create({
                    data: {
                        name: mCategory.name,
                        isDeleted: mCategory.isDeleted,
                        questionnaireTemplateId: builderTemplateId,
                        phaseId: mCategory.phaseId,
                        linkToQuestionnaire: mCategory.linkToQuestionnaire,
                        isCompanyCategory: true,
                        companyId: user.company.id, 
                        questionnaireOrder: mCategory.questionnaireOrder,
                        initialOrder: mCategory.initialOrder,
                        paintOrder: mCategory.paintOrder 
                    }
                });

                // Category questions.
                const mQuestions = mCategory.masterQuestions;
                // Create questions.
                await this.createBuilderTemplateQuestions(tx, mQuestions, category.id, builderTemplateId);
            }));
        });
    }

    private async createBuilderTemplateQuestions (
        tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, 
        "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
        mQuestions: any[],
        categoryId: number,
        builderTemplateId: number
    ) {
        await Promise.all(mQuestions.map(async (mQuestion) => {
            await tx.templateQuestion.create({
                data: {
                    isDeleted: mQuestion.isDeleted,
                    linkToQuestionnaire: mQuestion.linkToQuestionnaire,
                    question: mQuestion.question,
                    questionType: mQuestion.questionType,
                    multipleOptions: mQuestion.multipleOptions,
                    phaseId: mQuestion.phaseId,
                    questionnaireTemplateId: builderTemplateId,
                    categoryId,
                    questionOrder: mQuestion.questionOrder,
                    initialQuestionOrder: mQuestion.initialQuestionOrder,
                    paintQuestionOrder: mQuestion.paintQuestionOrder,
                }
            })
        }))
    }   


    // Copy project estimator template to builder from admin
    private async handleBuilderEstimatorTemplate (mTemplateId: number, builderProjectEstimatorTemplateId: number, user: any) {
        const template = await this.databaseService.masterProjectEstimatorTemplate.findUnique({
            where: { id: mTemplateId, isDeleted: false },
            include: {
                MasterProjectEstimatorTemplateHeader: {
                    where: { isDeleted: false, mpetId: mTemplateId },
                    orderBy: { headerOrder: 'asc' },
                    include: {
                        MasterProjectEstimatorTemplateData: {
                            where: { isDeleted: false, },
                            orderBy: { order: 'asc' }
                        }
                    }
                }
            }
        });

        if (!template || template.MasterProjectEstimatorTemplateHeader.length === 0) return;

        const estimatorData = template.MasterProjectEstimatorTemplateHeader;

        await this.databaseService.$transaction(async (tx) => {
            await Promise.all(estimatorData.map(async (header) => {
                await tx.projectEstimatorTemplate.update({
                    where: { id: builderProjectEstimatorTemplateId },
                    data: { profitCalculationType: template.profitCalculationType }
                })
                let projectHeader = await tx.projectEstimatorTemplateHeader.create({
                    data: {
                        petId: builderProjectEstimatorTemplateId,
                        companyId: user.company.id,
                        name: header.name,
                        headerOrder: header.headerOrder
                    }
                });

                let estData = header.MasterProjectEstimatorTemplateData;

                await Promise.all(estData.map(async (x) => {
                    await tx.projectEstimatorTemplateData.create({
                        data: {
                            item: x.item,
                            description: x.description,
                            costType: x.costType,
                            quantity: x.quantity,
                            unitCost: x.unitCost,
                            actualCost: x.actualCost,
                            grossProfit: x.grossProfit,
                            contractPrice: x.contractPrice,
                            petHeaderId: projectHeader.id,
                            order: x.order,
                            isLotCost: x.isLotCost,
                            isCourtesyCredit: x.isCourtesyCredit
                        }
                    })
                }));
            }))
        })
    }

    // Fn to get promocode information
    async getDiscountDetails(promo_code: string) {
        try {
            const response = await this.stripeService.getPromoCodeInfo(promo_code);

            if (!response.status) {
                throw new BadRequestException({ message: response.message });
            }

            return {
                success: true,
                discount: response.info.discount,
                promoCode: response.info.promo_code_id,
                couponId: response.info.coupon_id,
                duration: response.info.duration,
                message: response.message,
            };
        } catch (error) {
            console.log(error)
            throw new BadRequestException({ message: ResponseMessages.INVALID_PROMO_CODE })
        }
    }
}
