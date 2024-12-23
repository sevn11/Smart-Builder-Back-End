import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { ProjectDescriptionDTO } from './validators/create-update-project-description';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ProjectDescriptionService {

    constructor(private databaseService: DatabaseService) { }

    async getProjectDescriptions(user: User, companyId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let descriptions = await this.databaseService.projectDescription.findMany({
                    where: {
                        companyId,
                        isDeleted: false,

                    },

                    orderBy: {
                        name: 'asc'
                    }
                });

                return { descriptions }

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
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


    async createProjectDescription(user: User, companyId: number, body: ProjectDescriptionDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER  || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let description = await this.databaseService.projectDescription.create({
                    data: {
                        companyId,
                        ...body,
                    }
                })
                return { description }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                } else {
                    console.error(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }

            throw new InternalServerErrorException();
        }
    }


    // update an existing phase
    async updateProjectDescription(user: User, companyId: number, descriptionId: number, body: ProjectDescriptionDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER  || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Retrieve the project description
                let description = await this.databaseService.projectDescription.findFirstOrThrow({
                    where: {
                        id: descriptionId,
                        companyId,
                        isDeleted: false
                    }
                });

                // Update the project description
                description = await this.databaseService.projectDescription.update({
                    where: {
                        id: descriptionId,
                        companyId,
                        isDeleted: false
                    },
                    data: {
                        ...body,
                    }
                });

                return { description };

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.CUSTOMER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }

    }

    async deleteProjectDescription(user: User, companyId: number, descriptionId: number) {
        try {
            // Check if User is Admin or Builder of the Company
            if (user.userType === UserTypes.ADMIN || user.userType === UserTypes.BUILDER  || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType === UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Verify if the description exists for the given company and customer
                let description = await this.databaseService.projectDescription.findFirstOrThrow({
                    where: {
                        id: descriptionId,
                        companyId,
                        isDeleted: false,
                    },
                });

                // Proceed to soft-delete the description
                description = await this.databaseService.projectDescription.update({
                    where: { id: descriptionId },
                    data: { isDeleted: true },
                });

                // Update jobs that reference the deleted description
                const jobs = await this.databaseService.job.updateMany({
                    where: {
                        descriptionId: descriptionId,
                    },
                    data: {
                        descriptionId: null,
                    },
                });

                // Fetch the updated list of non-deleted project descriptions
                const nonDeletedDescriptions = await this.databaseService.projectDescription.findMany({
                    where: {
                        companyId,
                        isDeleted: false,
                    },
                });

                return { descriptions: nonDeletedDescriptions, message: ResponseMessages.SUCCESSFUL };
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.error("Error deleting project description:", error.message, error.stack);

            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException("An unexpected error occurred.");
        }
    }



}
