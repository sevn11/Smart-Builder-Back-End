import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import * as argon from 'argon2';
import { DatabaseService } from 'src/database/database.service';
import { ChangePasswordDTO } from './validators/change-password';
import { ResponseMessages } from 'src/core/utils/messages';

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
                include: {
                    company: true,
                    PermissionSet: true
                }
            });
            delete userObj.hash;
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
}
