import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';
import { SignUpDTO, SignInDTO, ForgotPasswordDTO, PasswordResetDTO } from './validators';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes } from 'src/core/utils';
import { HelperFunctions } from 'src/core/utils/helpers';
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

    async forgotMyPassword(body: ForgotPasswordDTO) {

        try {

            // Get if email exist
            let user = await this.databaseService.user.findUniqueOrThrow({
                where: {
                    email: body.email
                }
            });
            // Generate Code
            let code = HelperFunctions.generateCode();
            await this.databaseService.user.update({
                where: {
                    id: user.id
                },
                data: {
                    passwordResetCode: code
                }
            })
            // Todo: Send Email
            // send Response
            return { code: code, message: ResponseMessages.PASSWORD_RESET_CODE_SENT }

        } catch (error) {
            // Database Exceptions
            console.log(error);
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    return { message: ResponseMessages.PASSWORD_RESET_CODE_SENT }
                throw new InternalServerErrorException();
            } else {
                throw new InternalServerErrorException();
            }
        }
    }

    async resetMyPassword(body: PasswordResetDTO) {
        try {
            let user = await this.databaseService.user.findFirstOrThrow({
                where: {
                    passwordResetCode: body.code
                }
            });
            let hash = await argon.hash(body.password);
            await this.databaseService.user.update({
                where: {
                    id: user.id
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
}
