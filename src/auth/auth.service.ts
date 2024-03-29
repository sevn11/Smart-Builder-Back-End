import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';
import { SignUpDTO, SignInDTO } from './validators';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes } from 'src/core/utils';
import { ResponseMessages } from 'src/core/utils/messages';
import { UserTypes } from 'src/core/utils/user-types';


@Injectable()
export class AuthService {
    constructor(private databaseService: DatabaseService, private jwtService: JwtService) {
    }

    async signup(body: SignUpDTO) {
        try {
            const hash = await argon.hash(body.password);
            const user = await this.databaseService.user.create({
                data: {
                    email: body.email,
                    hash,
                    name: body.name,
                    userType: UserTypes.BUILDER,
                    company: {
                        create: {
                            name: body.companyName
                        }
                    },
                    PermissionSet: {
                        create: {
                            fullAccess: true,
                            view_only: false
                        }
                    }
                },
                include: {
                    company: true,
                    PermissionSet: true
                }
            });
            delete user.hash;
            const payload = { sub: user.id, email: user.email, companyId: user.company.id };
            const access_token = await this.jwtService.signAsync(payload);
            return { user, access_token };
        } catch (ex) {
            // Database Exceptions
            if (ex instanceof PrismaClientKnownRequestError) {
                if (ex.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.UNIQUE_EMAIL_ERROR);
                else {
                    console.log(ex.code);
                }
            }
            console.log(ex);
            throw new InternalServerErrorException()
        }
    }

    async login(body: SignInDTO) {
        console.log(body);
        try {
            const user = await this.databaseService.user.findUniqueOrThrow({
                where: {
                    email: body.email
                },
                include: {
                    company: true,
                    PermissionSet: true
                }
            })
            if (await argon.verify(user.hash, body.password)) {
                delete user.hash;
                const payload = { sub: user.id, email: user.email, companyId: user.company.id };
                const access_token = await this.jwtService.signAsync(payload);
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
            } else {
                throw new InternalServerErrorException();
            }

        }


    }
}
