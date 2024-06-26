import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { JobContractorDTO } from './validators/job-contractor';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UpdateJobContractorDTO } from './validators/edit-job-contractor';

@Injectable()
export class JobContractorService {

    constructor(private databaseService: DatabaseService) {}

    // fn get all job contractors
    async getAllJobContractors(user: User, companyId: number, jobId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let jobContractors = await this.databaseService.jobContractor.findMany({
                    where: {
                        companyId,
                        jobId,
                    },
                    include: {
                        contractor: {
                            include: {
                                phase: true
                            }
                        }
                    }
                });
                return { jobContractors }
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

    // fn to assign a main contractor to a job (create job contractor)
    async createJobcontractor(user: User, companyId: number, jobId: number, body: JobContractorDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                // Check if contractor already assigned
                const existingJobContractors = await this.databaseService.jobContractor.findMany({
                    where: {
                        companyId,
                        jobId,
                        contractorId: { in: body.contractorIds }
                    }
                });
                
                if (existingJobContractors.length > 0) {
                    throw new ConflictException('One or more contractors are already assigned to this job');
                }

                // Create the job contractor 
                const jobContractors = await Promise.all(body.contractorIds.map(async contractorId => {
                    return await this.databaseService.jobContractor.create({
                        data: {
                            companyId,
                            jobId,
                            contractorId
                        }
                    });
                }));
                
                return { jobContractors };

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

    // fn to delete the contractor from the job
    async deletejobContractor(user: User, companyId: number, jobId: number, jobContractorId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                
                // check jobcontractor exist or not
                await this.databaseService.jobContractor.findFirstOrThrow({
                    where: {
                        id: jobContractorId,
                        companyId,
                        jobId
                    }
                });
                
                // delete the contractor from the job
                await this.databaseService.jobContractor.delete({
                    where: {
                        id: jobContractorId,
                        companyId,
                        jobId
                    }
                })
                
                return { message: ResponseMessages.SUCCESSFUL }
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

}
