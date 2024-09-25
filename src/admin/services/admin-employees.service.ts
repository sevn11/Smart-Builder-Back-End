import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { GetEmployeeListDTO } from '../validators/get-emloyee-list';
import { CreateUpdateExtraFeeDTO } from '../validators/create-update-extra-fee';

@Injectable()
export class AdminEmployeeService {

    constructor(private databaseService: DatabaseService) {

    }

    async getEmployeeList(query: GetEmployeeListDTO) {

        try {
            query.page = query.page === 0 ? 0 : query.page - 1;

            const whereCondition: any = {
                userType: query.userType || 'Employee',
                isDeleted: false,
                name: {
                    contains: query.search,
                    mode: 'insensitive',
                },

            };

            if (query.companyId) {
                whereCondition.companyId = query.companyId;
            }

            const [employees, totalCount] = await this.databaseService.$transaction([
                this.databaseService.user.findMany({
                    where: whereCondition,
                    skip: query.page * query.limit,
                    take: query.limit,
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        userType: true,
                        isActive: true,
                        company: {
                            select: {
                                name: true,
                                id: true,
                            },
                        },
                    },
                }),
                this.databaseService.user.count({
                    where: whereCondition,
                }),
            ]);

            return { employees, totalCount };
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException();
        }
    }

    async deleteEmployee(employeeId: number) {
        try {

            // Check if the employee exists and is not marked as deleted
            let employee = await this.databaseService.user.findUniqueOrThrow({
                where: {
                    id: employeeId,
                    isDeleted: false
                }
            });

            // Update the isDeleted field for the specific employee
            await this.databaseService.user.update({
                where: {
                    id: employeeId
                },
                data: {
                    isActive: false,
                    isDeleted: true
                }
            });

            return { message: ResponseMessages.BUILDER_REMOVED };

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                } else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    async addUpdateExtraFee(body: CreateUpdateExtraFeeDTO) {
        const { userId, extraFee } = body;

        try {
            // Check if there's already an entry for the user
            const existingSetting = await this.databaseService.suaSettings.findFirst({
                where: { userId },
            });

            if (existingSetting) {
                // Update the existing record
                await this.databaseService.suaSettings.update({
                    where: { id: existingSetting.id },
                    data: { extraFee: extraFee ?? 0.00 },
                });
            } else {
                // Create a new record if none exists
                await this.databaseService.suaSettings.create({
                    data: {
                        userId: userId,
                        extraFee: extraFee ?? 0.00,
                    },
                });
            }

            return { message: 'Extra fee added/updated successfully' };
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                } else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }

    async getExtraFee(userId: number) {
        try {

            const setting = await this.databaseService.suaSettings.findFirst({
                where: { userId },
            });

            // If no setting is found, default the extraFee to 0
            if (!setting) {
                return { extraFee: 0.00 };
            }

            // Return the existing extraFee
            return { extraFee: setting.extraFee };
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                } else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }


}
