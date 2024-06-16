import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { ContractorPhaseDTO } from './validators/contractor-phase';

@Injectable()
export class ContractorPhaseService {

    constructor(private databaseService: DatabaseService) {}

    // get all phases
    async getAllPhases(user: User, companyId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let phases = await this.databaseService.contractorPhase.findMany({
                    where: {
                        companyId,
                        isDeleted: false
                    },
                    orderBy: {
                        name: 'asc' 
                    }
                });
                return { phases }
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

    // create new phase
    async createPhase(user: User, companyId: number, body: ContractorPhaseDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                // Check for existing non-deleted contractor with the same email
                const existingPhase = await this.databaseService.contractorPhase.findFirst({
                    where: {
                        name: body.name,
                        isDeleted: false,
                    },
                });

                if (existingPhase) {
                    throw new ConflictException('A phase with this name already exists.');
                }
                let phase = await this.databaseService.contractorPhase.create({
                    data: {
                        companyId,
                        ...body,
                    }
                })
                return { phase }
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
    async updatePhase(user: User, companyId: number, phaseId: number, body: ContractorPhaseDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // throw error if contractor was not found
                let phase = await this.databaseService.contractorPhase.findFirstOrThrow({
                    where: {
                        id: phaseId,
                        companyId,
                        isDeleted: false
                    }
                });

                // checking phase with name already exist (exclude editing one)
                const existingPhase = await this.databaseService.contractorPhase.findFirst({
                    where: {
                        name: body.name,
                        id: {
                            not: phaseId // Exclude the current contractor being updated
                        },
                        isDeleted: false,
                    },
                });

                if (existingPhase) {
                    throw new ConflictException('A phase with this name already exists.');
                }

                // updating the contractor phase
                phase = await this.databaseService.contractorPhase.update({
                    where: {
                        id: phase.id,
                        companyId,
                        isDeleted: false
                    },
                    data: {
                        ...body,
                    }
                });
                return { phase }
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

    async deletePhase(user: User, companyId: number, phaseId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                
                // checking phase exist or not
                await this.databaseService.contractorPhase.findFirstOrThrow({
                    where: {
                        id: phaseId,
                        companyId,
                        isDeleted: false
                    }
                });

                // deleting the phase
                await this.databaseService.contractorPhase.update({
                    where: {
                        id: phaseId,
                        companyId,
                    },
                    data: {
                        isDeleted: true
                    }

                });

                await this.databaseService.contractor.updateMany({
                    where: {
                        phaseId: phaseId,
                        companyId
                    },
                    data: {
                        phaseId: null
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
