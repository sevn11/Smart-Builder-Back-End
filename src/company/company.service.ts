import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { AddUserDTO } from './validators';
import { HelperFunctions, PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class CompanyService {

    constructor(private databaseService: DatabaseService) {

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
                const employee = await this.databaseService.user.create({
                    data: {
                        email: body.email,
                        name: body.name,
                        userType: UserTypes.EMPLOYEE,
                        companyId: companyId,
                        invitationToken: HelperFunctions.generateRandomString(16), // Generate Invitation Token
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
                        PermissionSet: true
                    }
                });
                return { "message": ResponseMessages.USER_INVITATION_SENT }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
            //  Send Email
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
