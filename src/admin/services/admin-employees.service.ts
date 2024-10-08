import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { GetEmployeeListDTO } from '../validators/get-emloyee-list';

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

}
