import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as argon from 'argon2';
import { DatabaseService } from 'src/database/database.service';
import { ChangePasswordDTO, UpdateMyProfileDTO } from './validators';
import { HelperFunctions, ResponseMessages } from 'src/core/utils';
import { StripeService } from 'src/core/services/stripe.service';

@Injectable()
export class UserService {
    constructor(private databaseService: DatabaseService, private stripeService: StripeService) {

    }

    async me(user: User) {
        try {
            const userObj = await this.databaseService.user.findUnique({
                where: {
                    id: user.id,
                    isActive: true,
                    isDeleted: false
                },
                omit: {
                    hash: true,
                    invitationToken: true,
                    passwordResetCode: true,
                    isDeleted: false
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
                            isDeleted: true
                        }
                    }
                }
            });
            return userObj;
        } catch (error) {
            throw new InternalServerErrorException()
        }
    }

    async changePassword(user: User, body: ChangePasswordDTO) {
        try {
            if (!await argon.verify(user.hash, body.oldPassword)) {
                throw new BadRequestException(ResponseMessages.PASSWORD_IS_INVALID);
            }
            let hash = await argon.hash(body.newPassword);
            await this.databaseService.user.update({
                where: {
                    id: user.id,
                    isActive: true,
                    isDeleted: false
                },
                data: {
                    hash
                }
            });
            return { message: ResponseMessages.PASSWORD_UPDATED }
        } catch (error) {
            console.log(error);
            if (error instanceof BadRequestException) {
                throw error
            } else {
                throw new InternalServerErrorException()
            }
        }


    }

    async updateMyProfile(user: User, body: UpdateMyProfileDTO) {
        try {
            let updatedUser = await this.databaseService.user.update({
                where: {
                    id: user.id,
                    isActive: true,
                    isDeleted: false
                },
                data: {
                    name: body.name
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
                            userId: true,
                            isDeleted: true
                        }
                    }
                }
            });
            return { message: ResponseMessages.PROFILE_UPDATED, updatedUser }
        } catch (error) {
            console.log(error);
            throw new InternalServerErrorException();
        }
    }

    async tos(user: User) {
        try {
            await this.databaseService.user.update({
                where: {
                    id: user.id,
                    isActive: true,
                    isDeleted: false
                },
                data: {
                    isTosAccepted: true,
                    tosAcceptanceTime: new Date().toISOString(),
                    tosVersion: HelperFunctions.getTosVersion()
                }
            });
            return { message: ResponseMessages.SUCCESSFUL };
        } catch (error) {
            console.log(error);
            throw new InternalServerErrorException()
        }
    }

    async getSignNowPlanStatus(user: User) {
        try {
            let userData = await this.databaseService.user.findUnique({
                where: {
                    id: user.id,
                    isDeleted: false,
                    isActive: true
                },
                include: {
                    company: true
                }
            });
            
            if (
                userData &&
                userData.company &&
                userData.company.signNowStripeProductId &&
                userData.company.signNowSubscriptionId
            ) {
                let res = await this.stripeService.getSignNowPlanStatus(userData.company.signNowSubscriptionId);
                if (res.status) {
                    return { signNowStatus: true };
                } else {
                    return { signNowStatus: false };
                }
            } else {
                return { signNowStatus: false };
            }
        } catch (error) {
            console.log(error);
            throw new InternalServerErrorException()
        }
    }

    async checkProjectAccess(user: User, jobId: number) {
        try {
            const userProjectPermission = await this.databaseService.permissionSet.findUnique({
                where: { userId: user.id },
                select: { fullAccess: true, projectAccess: true }
            });
    
            if (!userProjectPermission) {
                return { hasProjectAccess: false };
            }
    
            if (userProjectPermission.fullAccess) {
                return { hasProjectAccess: true };
            }
            if (userProjectPermission.projectAccess) {
                // If user has global project access, no need to check project
                return { hasProjectAccess: true };
            }
    
            const projectWithPermission = await this.databaseService.job.findUnique({
                where: { id: jobId, userId: user.id }
            });
    
            const hasProjectAccess = !!projectWithPermission;
            return { hasProjectAccess };
    
        } catch (error) {
            console.error('checkProjectAccess error:', error);
            return { hasProjectAccess: false };
        }
    }
}

