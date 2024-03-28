import { Injectable, InternalServerErrorException, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

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
}

