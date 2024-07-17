import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { JobProjectEstimatorHeaderDTO } from './validators/add-header';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JobProjectEstimatorDTO } from './validators/add-project-estimator';
import { JobProjectEstimatorAccountingDTO } from './validators/add-project-estimator-accounting';

@Injectable()
export class JobProjectEstimatorService {

    constructor(private databaseService: DatabaseService) {}

    // get all headers and project estimator data
    async getProjectEstimatorData (user: User, companyId: number, jobId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let projectEstimatorData = await this.databaseService.jobProjectEstimatorHeader.findMany({
                    where: {
                        companyId,
                        jobId,
                        isDeleted: false
                    },
                    include: {
                        JobProjectEstimator: {
                            where: {
                                isDeleted: false
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc' 
                    }
                });
                return { projectEstimatorData }
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

    // create new header for project estimator
    async createHeader (user: User, companyId: number, jobId: number, body: JobProjectEstimatorHeaderDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                // check new header is named as 'accounting'
                if (body.name.toLowerCase() === "accounting") {
                    throw new ConflictException("Accounting header already exist")
                }

                let projectEstimatorHeader = await this.databaseService.jobProjectEstimatorHeader.create({
                    data: {
                        companyId,
                        jobId,
                        name: body.name
                    }
                })
                return { projectEstimatorHeader }
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
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // edit project estimator header
    async editHeader (user: User, companyId: number, jobId: number, headerId: number, body: JobProjectEstimatorHeaderDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                // check new header is named as 'accounting'
                if (body.name.toLowerCase() === "accounting") {
                    throw new ConflictException("Accounting header already exist")
                }

                // check non deleted header exist or not
                await this.databaseService.jobProjectEstimatorHeader.findFirstOrThrow({
                    where: {
                        id: headerId,
                        companyId,
                        jobId,
                        isDeleted: false
                    }
                });

                let projectEstimatorHeader = await this.databaseService.jobProjectEstimatorHeader.update({
                    where: { id: headerId },
                    data: {
                        name: body.name
                    }
                });
    
                return { projectEstimatorHeader };
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
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // delete project estimator data row of a header
    async deleteHeader (user: User, companyId: number, jobId: number, headerId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // check header exisit or not
                let header = await this.databaseService.jobProjectEstimatorHeader.findFirstOrThrow({
                    where: {
                        id: headerId,
                        companyId,
                        jobId,
                        isDeleted: false
                    }
                });

                // restrict accounting header delete
                if (header.name.toLowerCase() === "accounting") {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Delete header
                await this.databaseService.jobProjectEstimatorHeader.update({
                    where: { id: headerId },
                    data: { isDeleted: true }
                });
                
                // Delete related project estimator rows
                await this.databaseService.jobProjectEstimator.updateMany({
                    where: { jobProjectEstimatorHeaderId: headerId },
                    data: { isDeleted: true }
                });

                return { message: ResponseMessages.SUCCESSFUL }
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

    // create new project estimator data row for a header
    async createProjectEstimator (user: User, companyId: number, jobId: number, body: JobProjectEstimatorDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let projectEstimator = await this.databaseService.jobProjectEstimator.create({
                    data: {
                        ...body
                    }
                });
                
                return { projectEstimator }
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

    // update project estimator data row of a header
    async updateProjectEstimator (user: User, companyId: number, jobId: number, projectEstimatorId: number, body: JobProjectEstimatorDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                await this.databaseService.jobProjectEstimator.findFirstOrThrow({
                    where: {
                        id: projectEstimatorId,
                        isDeleted: false
                    }
                });

                let projectEstimator = await this.databaseService.jobProjectEstimator.update({
                    where: {
                        id: projectEstimatorId,
                        isDeleted: false
                    },
                    data: {
                        ...body
                    }
                });

                return { projectEstimator }
                
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

    // delete project estimator data row of a header
    async deleteProjectEstimator (user: User, companyId: number, jobId: number, projectEstimatorId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                await this.databaseService.jobProjectEstimator.findFirstOrThrow({
                    where: {
                        id: projectEstimatorId,
                        isDeleted: false
                    }
                });

                await this.databaseService.jobProjectEstimator.update({
                    where: {
                        id: projectEstimatorId,
                        isDeleted: false
                    },
                    data: {
                        isDeleted: true
                    }
                });

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

    // create new project estimator data row for Accounting section
    async createProjectEstimatorAccounting (user: User, companyId: number, jobId: number, body: JobProjectEstimatorAccountingDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // check Accounting header already exist or not else create new one
                let accountingHeader = await this.databaseService.jobProjectEstimatorHeader.findFirst({
                    where: {
                        companyId,
                        jobId,
                        name: 'Accounting',
                        isDeleted: false,
                    }
                });
                
                if(!accountingHeader) {
                    let createdHeader = await this.databaseService.jobProjectEstimatorHeader.create({
                        data: {
                            companyId,
                            jobId,
                            name: 'Accounting'
                        }
                    });
                    accountingHeader = createdHeader;
                }

                // insert new row for accounting
                let projectEstimator = await this.databaseService.jobProjectEstimator.create({
                    data: {
                        jobProjectEstimatorHeaderId: accountingHeader.id,
                        ...body
                    }
                });
                
                return { projectEstimator }
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
