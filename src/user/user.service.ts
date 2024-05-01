import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as argon from 'argon2';
import { DatabaseService } from 'src/database/database.service';
import { ChangePasswordDTO, UpdateMyProfileDTO } from './validators';
import { HelperFunctions, ResponseMessages } from 'src/core/utils';

@Injectable()
export class UserService {
    constructor(private databaseService: DatabaseService) {

    }

    async me(user: User) {
        try {
            const userObj = await this.databaseService.user.findUnique({
                where: {
                    id: user.id,
                },
                omit: {
                    hash: true,
                    invitationToken: true,
                    passwordResetCode: true
                },
                include: {
                    company: true,
                    PermissionSet: {
                        omit: {
                            userId: true
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
                    id: user.id
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
                    id: user.id
                },
                data: {
                    name: body.name
                },
                omit: {
                    hash: true,
                    invitationToken: true,
                    passwordResetCode: true
                },
                include: {
                    company: true,
                    PermissionSet: {
                        omit: {
                            userId: true
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
                    id: user.id
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
}

