import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class UserService {
    constructor(private databaseService: DatabaseService) {

    }

    async me() {
        try {
            const user = await this.databaseService.user.findFirst();
            delete user.hash;
            return user;
        } catch (error) {
            throw new InternalServerErrorException()
        }
    }
}

