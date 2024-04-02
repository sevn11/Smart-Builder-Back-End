import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { AddUserDTO } from './validators';
import { HelperFunctions, PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';
import { SendgridService } from 'src/core/services';

@Injectable()
export class CompanyService {

    constructor(
        private databaseService: DatabaseService,
        private readonly config: ConfigService,
        private sendgridService: SendgridService
    ) {

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
                        email: body.email,
                        name: body.name,
                        userType: UserTypes.EMPLOYEE,
                        companyId: companyId,
                        invitationToken, // Generate Invitation Token
                        PermissionSet: {
                            create: {
                                fullAccess: body.permissionSet.fullaccess,
                                specifications: body.permissionSet.specifications,
                                schedule: body.permissionSet.schedule,
                                selection: body.permissionSet.selection,
                                view_only: body.permissionSet.view_only
                            }
                        }
                    },
                    include: {
                        PermissionSet: true,
                        company: true
                    }
                });
                //  Send Email
                const templateData = {
                    user_name: employee.name,
                    company_name: employee.company.name,
                    password_link: `${this.config.get("FRONTEND_BASEURL")}/auth/users/${invitationToken}`
                }
                this.sendgridService.sendEmailWithTemplate(employee.email, this.config.get('EMPLOYEE_PASSWORD_SET_TEMPLATE_ID'), templateData)
                return { "message": ResponseMessages.USER_INVITATION_SENT }
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
            }
            throw error;
        }
    }
}
