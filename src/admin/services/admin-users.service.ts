import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { ChangeBuilderAccessDTO, GetBuilderListDTO } from '../validators';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class AdminUsersService {
    constructor(private databaseService: DatabaseService) {

    }
    async getBuilders(query: GetBuilderListDTO) {
        try {
            query.page = query.page === 0 ? 0 : query.page - 1

            let [builders, totalCount] = await this.databaseService.$transaction([
                this.databaseService.user.findMany({
                    where: {
                        userType: UserTypes.BUILDER,
                        isActive: query.isActive,
                        name: {
                            contains: query.search,
                            mode: 'insensitive'
                        },
                        isDeleted: false,
                    },
                    skip: query.page * query.limit,
                    take: query.limit,
                    omit: {
                        hash: true,
                        invitationToken: true,
                        passwordResetCode: true,
                        isDeleted: false,
                    },
                    include: {
                        company: {
                            select: {
                                name: true,
                                id: true
                            }
                        }
                    }
                }),
                this.databaseService.user.count({
                    where: {
                        userType: UserTypes.BUILDER,
                        isActive: query.isActive,
                        name: {
                            contains: query.search,
                            mode: 'insensitive'
                        },
                        isDeleted: false,
                    },
                })

            ]);
            return { builders, totalCount }
        } catch (error) {
            console.log(error);
            throw new InternalServerErrorException()
        }
    }
    async changeBuilderAccess(builderId: number, body: ChangeBuilderAccessDTO) {
        try {
            let builder = await this.databaseService.user.findUniqueOrThrow({
                where: {
                    id: builderId,
                    isDeleted: false,
                }
            });
            let [, user,] = await this.databaseService.$transaction([
                this.databaseService.company.update({
                    where: {
                        id: builder.companyId,
                        isDeleted: false
                    },
                    data: {
                        isActive: body.isActive
                    }
                }),
                this.databaseService.user.update({
                    where: {
                        id: builderId,
                        isDeleted: false
                    },
                    data: {
                        isActive: body.isActive
                    },
                    omit: {
                        hash: true,
                        invitationToken: true,
                        passwordResetCode: true,
                        isDeleted: true
                    },
                    include: {
                        company: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
                }),
                this.databaseService.user.updateMany({
                    where: {
                        companyId: builder.companyId,
                        isDeleted: false
                    },
                    data: {
                        isActive: body.isActive
                    }
                }),

            ]);
            return { user }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    async deleteBuilder(builderId: number) {
        try {
            let builder = await this.databaseService.user.findUniqueOrThrow({
                where: {
                    id: builderId,
                    isDeleted: false
                }
            });
            await this.databaseService.$transaction([
                this.databaseService.company.update({
                    where: {
                        id: builder.companyId,
                        isDeleted: false,
                    },
                    data: {
                        isActive: false,
                        isDeleted: true
                    }
                }),
                this.databaseService.user.update({
                    where: {
                        id: builderId,
                        isDeleted: false
                    },
                    data: {
                        isActive: false,
                        isDeleted: true
                    },
                }),
                this.databaseService.user.updateMany({
                    where: {
                        companyId: builder.companyId,
                        isDeleted: false
                    },
                    data: {
                        isActive: false,
                        isDeleted: true
                    },
                }),
                this.databaseService.customer.updateMany({
                    where: {
                        companyId: builder.companyId,
                        isDeleted: false
                    },
                    data: {
                        isDeleted: true
                    },
                }),
                this.databaseService.job.updateMany({
                    where: {
                        companyId: builder.companyId,
                        isDeleted: false
                    },
                    data: {
                        isDeleted: true
                    },
                }),
                this.databaseService.questionnaireTemplate.updateMany({
                    where: {
                        companyId: builder.companyId,
                        isDeleted: false
                    },
                    data: {
                        isDeleted: true
                    },
                }),
                this.databaseService.category.updateMany({
                    where: {
                        companyId: builder.companyId,
                        isDeleted: false
                    },
                    data: {
                        isDeleted: true
                    },
                }),
            ]);
            return { message: ResponseMessages.BUILDER_REMOVED }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }
}
