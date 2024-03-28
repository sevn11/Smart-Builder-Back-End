import { Injectable, InternalServerErrorException, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class UserService {
    constructor(private databaseService: DatabaseService) {

    }

    async me(user: User) {
        return user;
    }
}

