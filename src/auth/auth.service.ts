import { BadRequestException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { AuthDTO } from './validators';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes } from 'src/utils';
import { ResponseMessages } from 'src/utils/messages';


@Injectable()
export class AuthService {
    constructor(private databaseService: DatabaseService) {

    }

    async signup(body: AuthDTO) {
        try {
            const hash = await argon.hash(body.password);
            const user = await this.databaseService.user.create({
                data: {
                    email: body.email,
                    hash,
                }
            });
            delete user.hash;
            return user;
        } catch (ex) {
            // Database Exceptions
            if (ex instanceof PrismaClientKnownRequestError) {
                if (ex.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.UNIQUE_EMAIL_ERROR);
                else {
                    console.log(ex.code);
                }
            }
            throw new InternalServerErrorException()
        }
    }

    async login(body: AuthDTO) {
        console.log(body);
        try {
            const user = await this.databaseService.user.findUniqueOrThrow({
                where: {
                    email: body.email
                }
            })
            if (await argon.verify(user.hash, body.password)) {
                delete user.hash;
                return user;

            } else {
                throw new NotFoundException(ResponseMessages.INVALID_CREDENTIALS);
            }
        } catch (ex) {
            // Database Exceptions
            if (ex instanceof PrismaClientKnownRequestError) {
                if (ex.code == PrismaErrorCodes.NOT_FOUND)
                    throw new NotFoundException(ResponseMessages.INVALID_CREDENTIALS);
            } else if (ex instanceof NotFoundException) {
                throw ex;
            } else {
                throw new InternalServerErrorException();
            }

        }


    }
}
