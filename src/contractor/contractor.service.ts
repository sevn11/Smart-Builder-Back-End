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
                        contractorOrder: 'asc' 
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

                const maxOrder = await this.databaseService.contractor.aggregate({
                    _max: { contractorOrder: true, },
                    where: { companyId, isDeleted: false }
                });
                let order = maxOrder._max.contractorOrder ? maxOrder._max.contractorOrder + 1 : 1;
                
                let contractor = await this.databaseService.contractor.create({
                    data: {
                        companyId,
                        name: body.name,
                        email: body.email,
                        phaseId: body.phaseId,
                        contractorOrder: order
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
                    }
                });
                const phaseId = contractor.phase.id;
                const jobContractor = await this.databaseService.jobContractor.findMany({
                    where: {
                        companyId,
                        contractorId: contractor.id
                    },
                    select: {
                        jobId: true
                    }
                });
                let contractorJobIds = []
                if(jobContractor) {
                    contractorJobIds = jobContractor.map(item => item.jobId)
                }
                const [categoryDetails, clientCategoryDetails] = await Promise.all([
                    await this.databaseService.category.findMany({
                        where: {
                            companyId,
                            isDeleted: false,
                            phaseIds: {
                                has: phaseId
                            }
                        },
                        include: {
                            questions: {
                                where: {
                                    isDeleted: false,
                                    phaseIds: {
                                        has: phaseId
                                    }
                                }
                            }
                        }
                    }),
                    await this.databaseService.clientCategory.findMany({
                        where: {
                            companyId,
                            isDeleted: false,
                            jobId: {
                                in: contractorJobIds
                            },
                            phaseIds: {
                                has: phaseId
                            }
                        },
                        include: {
                            ClientTemplateQuestion: {
                                where: {
                                    isDeleted: false,
                                    phaseIds: {
                                        has: phaseId
                                    }
                                }
                            }
                        }
                    }),
                ]);
                
                let formattedDetails = [
                    ...categoryDetails.map(category => ({
                        category: category.id,
                        categoryName: category.name,
                        questions: category.questions.map(question => ({
                            questionId: question.id,
                            questionText: question.question,
                            questionType: question.questionType
                        }))
                    })),
                    ...clientCategoryDetails.map(clientCategory => ({
                        category: clientCategory.id,
                        categoryName: clientCategory.name,
                        questions: clientCategory.ClientTemplateQuestion.map(question => ({
                            questionId: question.id,
                            questionText: question.question,
                            questionType: question.questionType
                        }))
                    }))
                ];

                // Prepare the contractor response
                const contractorResponse = {
                    id: contractor.id,
                    name: contractor.name,
                    phase: contractor.phase,
                    categories: formattedDetails,
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

    async updateOrder(user: User, companyId: number, contractorId: number, body: {contractorOrder: number}) {
        try {

            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                let company = await this.databaseService.company.findUnique({
                    where: {
                        id: companyId,
                        isDeleted: false,
                    }
                })

                if (!company) {
                    throw new ForbiddenException("Company not found");
                }

                let contractor = await this.databaseService.contractor.findUniqueOrThrow({
                    where: {
                        id: contractorId,
                        companyId,
                        isDeleted: false
                    }
                })

                const currentOrder = contractor.contractorOrder

                if (currentOrder > body.contractorOrder) {
                    // Contractor is moving up
                    await this.databaseService.$transaction([
                        this.databaseService.contractor.updateMany({
                            where: {
                                id: {
                                    not: contractorId
                                },
                                companyId,
                                isDeleted: false,
                                contractorOrder: {
                                    gte: body.contractorOrder,
                                    lt: currentOrder,
                                }
                            },
                            data: {
                                contractorOrder: {
                                    increment: 1,
                                }
                            }
                        }),
                        this.databaseService.contractor.update({
                            where: {
                                id: contractorId,
                                companyId,
                                isDeleted: false,
                            },
                            data: {
                                contractorOrder: body.contractorOrder
                            }
                        }),
                    ]);
                    let updatedContractors = await this.databaseService.contractor.findMany({
                        where: {
                            companyId,
                            isDeleted: false
                        },
                        include: {
                            phase: true
                        },
                        orderBy: {
                            contractorOrder: 'asc' 
                        }
                    })

                    return {
                        contractors: updatedContractors,
                        message: ResponseMessages.CONTRACTOR_ORDER_UPDATED,
                    }
                } else if (currentOrder < body.contractorOrder) {
                    // Contractor is moving down
                    await this.databaseService.$transaction([
                        this.databaseService.contractor.updateMany({
                            where: {
                                id: {
                                    not: contractorId
                                },
                                companyId,
                                isDeleted: false,
                                contractorOrder: {
                                    gt: currentOrder,
                                    lte: body.contractorOrder
                                }
                            },
                            data: {
                                contractorOrder: {
                                    decrement: 1,
                                }
                            }
                        }),
                        this.databaseService.contractor.update({
                            where: {
                                id: contractorId,
                                companyId,
                                isDeleted: false,
                            },
                            data: {
                                contractorOrder: body.contractorOrder
                            }
                        }),
                    ])
                    let updatedContractors = await this.databaseService.contractor.findMany({
                        where: {
                            companyId,
                            isDeleted: false
                        },
                        include: {
                            phase: true
                        },
                        orderBy: {
                            contractorOrder: 'asc' 
                        }
                    })

                    return {
                        contractors: updatedContractors,
                        message: ResponseMessages.CONTRACTOR_ORDER_UPDATED,
                    }
                } else {
                    throw new ForbiddenException("Unable to change the order.");
                }

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
                    console.log(error.code);
                }
            }

            throw new InternalServerErrorException();
        }
    }
}
