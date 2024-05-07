import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { CreateJobDTO, GetJobListDTO } from './validators';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JobStatus, PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';

@Injectable()
export class JobsService {

    constructor(private databaseService: DatabaseService) {

    }

    async createJob(user: User, companyId: number, body: CreateJobDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let customer = await this.databaseService.customer.findUnique({
                    where: {
                        id: body.customerId,
                        isDeleted: false,
                        companyId,
                    }
                });
                if (!customer) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let job = await this.databaseService.job.create({
                    data: {
                        description: body.description,
                        customerId: body.customerId,
                        status: JobStatus.OPEN,
                        companyId: company.id
                    },
                    include: {
                        customer: true
                    }
                });
                return { job }

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

    async getJobList(user: User, companyId: number, query: GetJobListDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || (user.userType == UserTypes.BUILDER && user.companyId === companyId)) {
                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId
                    }
                });
                if (!company) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let where = {
                    companyId,
                    isClosed: false,
                    isDeleted: false
                }
                if (query.closed) {
                    delete where.isClosed
                }
                let jobs = await this.databaseService.job.findMany({
                    where,
                    include: {
                        customer: true
                    }
                });
                return { jobs }
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
}
