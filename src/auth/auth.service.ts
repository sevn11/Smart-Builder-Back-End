import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { SignupDTO } from './validators';
import * as argon from 'argon2';


@Injectable()
export class AuthService {
    constructor (private databaseService: DatabaseService){

    }
  
    async signup(body: SignupDTO){
        const hash  = await argon.hash(body.email);
        const user = await this.databaseService.user.create({
            data:{
                email: body.email,
                hash,
            }
        });
        delete user.hash;
        return user;
    }
}
