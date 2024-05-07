import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { AddUserDTO, UpdateCompanyDTO, UpdateUserDTO, UploadLogoDTO, ChangeEmailDTO } from './validators';
import { HelperFunctions, PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';
import { AWSService, SendgridService } from 'src/core/services';

@Injectable()
export class CompanyService {

    constructor(
        private databaseService: DatabaseService,
        private readonly config: ConfigService,
        private sendgridService: SendgridService,
        private awsService: AWSService,
    ) {
    }

    async getUserList(user: User, companyId: number) {
        try {
            if (user.userType == UserTypes.BUILDER || user.userType === UserTypes.ADMIN) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let userList = await this.databaseService.user.findMany({
                    where: {
                        companyId,
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
                }
                );
                return { users: userList }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.COMPANY_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    async updateUser(user: User, companyId: number, userId: number, body: UpdateUserDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let employee = null;
                employee = await this.databaseService.user.findFirstOrThrow({
                    where: {
                        id: userId,
                        companyId: companyId
                    }
                });
                employee = await this.databaseService.user.update({
                    where: {
                        id: userId,
                        companyId: companyId
                    },
                    data: {
                        name: body.name,
                        PermissionSet: {
                            update: {
                                fullAccess: body.PermissionSet.fullAccess,
                                questionnaire: body.PermissionSet.questionnaire,
                                specifications: body.PermissionSet.specifications,
                                schedule: body.PermissionSet.schedule,
                                selection: body.PermissionSet.selection,
                                viewOnly: body.PermissionSet.viewOnly
                            }
                        }
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
                return { message: ResponseMessages.SUCCESSFUL, employee }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    async changeUserEmail(user: User, companyId: number, userId: number, body: ChangeEmailDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let employee = null;
                employee = await this.databaseService.user.findFirstOrThrow({
                    where: {
                        id: userId,
                        companyId: companyId
                    }
                });
                employee = await this.databaseService.user.update({
                    where: {
                        id: userId,
                        companyId: companyId
                    },
                    data: {
                        email: body.email,
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
                return { message: ResponseMessages.SUCCESSFUL, employee }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    async addUsers(user: User, companyId: number, body: AddUserDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                // Add User (Put precautions for email uniqueness)
                const invitationToken = HelperFunctions.generateRandomString(16);
                const employee = await this.databaseService.user.create({
                    data: {
                        email: body.email.toLowerCase(),
                        name: body.name,
                        userType: UserTypes.EMPLOYEE,
                        companyId: companyId,
                        invitationToken, // Generate Invitation Token
                        PermissionSet: {
                            create: {
                                fullAccess: body.PermissionSet.fullAccess,
                                questionnaire: body.PermissionSet.questionnaire,
                                specifications: body.PermissionSet.specifications,
                                schedule: body.PermissionSet.schedule,
                                selection: body.PermissionSet.selection,
                                viewOnly: body.PermissionSet.viewOnly
                            }
                        }
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
                //  Send Email
                const templateData = {
                    user_name: employee.name,
                    company_name: employee.company.name,
                    password_link: `${this.config.get("FRONTEND_BASEURL")}/auth/create-password?token=${invitationToken}`
                }
                this.sendgridService.sendEmailWithTemplate(employee.email, this.config.get('EMPLOYEE_PASSWORD_SET_TEMPLATE_ID'), templateData)
                return { "message": ResponseMessages.USER_INVITATION_SENT, employee }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
                    throw new BadRequestException(ResponseMessages.UNIQUE_EMAIL_ERROR);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            } else {
                throw new InternalServerErrorException();
            }
        }
    }

    async removeUser(user: User, companyId: number, userId: number) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let employee = await this.databaseService.user.findFirstOrThrow({
                    where: {
                        id: userId,
                        companyId: companyId
                    }
                });
                await this.databaseService.user.delete({
                    where: {
                        id: userId
                    }
                })
                return { "message": ResponseMessages.USER_REMOVED }

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }


        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    async getCompanyDetails(user: User, companyId: number) {
        try {
            if (user.companyId === companyId || user.userType === UserTypes.ADMIN) {
                let company = await this.databaseService.company.findUniqueOrThrow({
                    where: {
                        id: companyId
                    }
                });
                return { company }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.COMPANY_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    async getUploadLogoSignedUrl(user: User, companyId: number, body: UploadLogoDTO) {
        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let key: string = `companies/${companyId}/logos/${body.filename}`;
                let url = await this.awsService.generateS3PresignedUrl(key, body.contentType);
                return { url, message: ResponseMessages.SUCCESSFUL };

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error)
            if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    async updateCompany(user: User, companyId: number, body: UpdateCompanyDTO) {

        try {
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                company = await this.databaseService.company.update({
                    where: {
                        id: companyId
                    },
                    data: {
                        ...body
                    }
                });
                return { company }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error)
            if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }
}
