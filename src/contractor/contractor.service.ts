import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ContractorDTO } from './validators/contractor';
import { DatabaseService } from 'src/database/database.service';
import { User } from '@prisma/client';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class ContractorService {

    constructor(private databaseService: DatabaseService) {}

    // get all non-deleted contractors
    async getAllContractors(user: User, companyId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let contractors = await this.databaseService.contractor.findMany({
                    where: {
                        companyId,
                        isDeleted: false
                    },
                    include: {
                        phase: true
                    },
                    orderBy: {
                        name: 'asc' 
                    }
                });
                return { contractors }
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

    // fn to create a new contractor
    async createContractor(user: User, companyId: number, body: ContractorDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                
                let contractor = await this.databaseService.contractor.create({
                    data: {
                        companyId,
                        name: body.name,
                        email: body.email,
                        phaseId: body.phaseId,
                    }
                })
                return { contractor }
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

    // fn to get a single contractor details
    async getContractorDetails(user: User, companyId: number, contractorId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let contractor = await this.databaseService.contractor.findFirstOrThrow({
                    where: {
                        id: contractorId,
                        companyId,
                        isDeleted: false
                    }
                });
                return { contractor }
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

    // fn to update existing contractor
    async updateContractor(user: User, companyId: number, contractorId: number, body: ContractorDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // throw error if contractor was not found
                let contractor = await this.databaseService.contractor.findFirstOrThrow({
                    where: {
                        id: contractorId,
                        companyId,
                        isDeleted: false
                    }
                });

                // updating the contractor
                contractor = await this.databaseService.contractor.update({
                    where: {
                        id: contractor.id,
                        companyId,
                        isDeleted: false
                    },
                    data: {
                        name: body.name,
                        email: body.email,
                        phaseId: body.phaseId,
                    }
                });
                return { contractor }
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

    // fn to delete existing contractor
    async deleteContractor(user: User, companyId: number, contractorId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let contractor = await this.databaseService.contractor.findFirstOrThrow({
                    where: {
                        id: contractorId,
                        companyId,
                        isDeleted: false
                    }
                });
                await this.databaseService.contractor.update({
                    where: {
                        id: contractorId,
                        companyId,
                    },
                    data: {
                        isDeleted: true
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

    // Fn to fetch all categories under each project particular contractor assigend to
    async getContractorCategories(user: User, companyId: number, contractorId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let contractor = await this.databaseService.contractor.findFirstOrThrow({
                    where: {
                        id: contractorId,
                        companyId,
                        isDeleted: false,
                    },
                    include: {
                        phase: {
                            select: {
                                id: true,
                                name: true,
                            }
                        },
                        JobContractor: {
                            include: {
                                job: {
                                    include: {
                                        ClientTemplate: {
                                            include: {
                                                clientCategory: {
                                                    where: {
                                                        isDeleted: false,
                                                        linkToPhase: true,
                                                        contractorIds: {
                                                            has: contractorId
                                                        },
                                                    },
                                                    omit: { createdAt: true, updatedAt: true },
                                                    orderBy: { questionnaireOrder: 'asc' },
                                                    include: {
                                                        ClientTemplateQuestion: {
                                                            where: {
                                                                isDeleted: false,
                                                                linkToPhase: true,
                                                                contractorIds: {
                                                                    has: contractorId
                                                                },
                                                            },
                                                            select: { id: true, question: true, questionType: true },
                                                            orderBy: { questionOrder: 'asc' },
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                const jobDetails = contractor.JobContractor.map(jobContractor => {
                    const jobId = jobContractor.job.id;
                    const customerId = jobContractor.job.customerId;

                    // Gather all categories and questions under this job's client template
                    const categoriesWithQuestions = jobContractor.job.ClientTemplate.flatMap(clientTemplate =>
                        clientTemplate.clientCategory.map(category => ({
                            jobId,
                            customerId,
                            categoryId: category.id,
                            categoryName: category.name,
                            questions: category.ClientTemplateQuestion.map(question => ({
                                questionId: question.id,
                                questionText: question.question,
                                questionType: question.questionType
                            }))
                        }))
                    );

                    return categoriesWithQuestions;
                }).flat();

                // Prepare the contractor response
                const contractorResponse = {
                    id: contractor.id,
                    name: contractor.name,
                    phase: contractor.phase,
                    categories: jobDetails,
                };

                return { contractor: contractorResponse };
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
