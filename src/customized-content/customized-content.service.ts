import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { CustomizedContentDTO } from './validators/customized-content';

@Injectable()
export class CustomizedContentService {
    constructor(
        private databaseService: DatabaseService,
    ) { }

    // Get all customized contents
    async getCustomContents(user: User, companyId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                const proposalContent = await this.databaseService.customizedContent.findFirst({
                    where: { companyId, pageType: 'proposal' }
                });
                const specificationsContent = await this.databaseService.customizedContent.findFirst({
                    where: { pageType: 'specifications', companyId },
                });
                const selectionContent = await this.databaseService.customizedContent.findFirst({
                    where: { pageType: 'selections', companyId },
                });

                return {
                    proposalContent: proposalContent ? proposalContent.content : '',
                    specificationsContent: specificationsContent ? specificationsContent.content : '',
                    selectionContent: selectionContent ? selectionContent.content : '',
                };
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // Get customized content of a specific page
    async getSpecificContent(user: User, companyId: number, pageType: string) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                const result = await this.databaseService.customizedContent.findUnique({
                    where: {
                        companyId_pageType: {
                            companyId,
                            pageType,
                        },
                    },
                });

                return { content: result ? result.content : '' };
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // Create or update content
    async saveCustomContents(user: User, companyId: number, body: CustomizedContentDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                await this.databaseService.customizedContent.upsert({
                    where: {
                        companyId_pageType: {
                            companyId,
                            pageType: body.pageType,
                        },
                    },
                    update: {
                        content: body.content ?? ''
                    },
                    create: {
                        companyId,
                        ...body
                    }
                })
                
                return { message : ResponseMessages.SUCCESSFUL }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                  throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                } else {
                  console.error(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }
        
            throw new InternalServerErrorException();
        }
    }
}
