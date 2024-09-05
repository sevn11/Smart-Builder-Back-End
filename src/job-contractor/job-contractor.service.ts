import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { JobContractorDTO } from './validators/job-contractor';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { SendInfoToContractorDTO } from './validators/send-info-mail';
import { readFile } from 'fs/promises';
import { SendgridService } from 'src/core/services';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JobContractorService {

    constructor(
        private databaseService: DatabaseService,
        private sendgridService: SendgridService,
        private readonly config: ConfigService,
    ) { }

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


    // fn to send information mails to contarctors with files
    async sendInfoMail(user: User, companyId: number, jobId: number, body: SendInfoToContractorDTO) {
        try {
            // Check if User is Admin / Builder of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const jobContractors = body.jobContractors;
                const fileIds = body.files;
                const sendCC = body.sendCC;
                const subject = body.subject
                let ccMail = null;

                // get user company information
                let company = await this.databaseService.company.findUniqueOrThrow({
                    where: {
                        id: companyId,
                        isActive: true,
                        isDeleted: false
                    }
                });
                let replyTo = null;
                if (!company.email) {
                    throw new ForbiddenException("Company email not found");
                }
                replyTo = ccMail = company.email;

                // Prepare attachments array
                const attachments = await Promise.all(fileIds.map(async (fileId) => {
                    // Retrieve file data from database
                    const file = await this.databaseService.contractorFiles.findFirstOrThrow({
                        where: { id: fileId }
                    });

                    // Read file content asynchronously
                    const fileContent = await readFile(file.filePath);

                    // Return attachment object
                    return {
                        content: fileContent.toString('base64'),
                        filename: file.fileName,
                    };
                }));

                await Promise.all(jobContractors.map(async (jobContractorId) => {
                    // Retrieve job contractor data from database
                    const jobContractorData = await this.databaseService.jobContractor.findFirstOrThrow({
                        where: { id: jobContractorId }
                    });

                    // Retrieve contractor data using contractorId from job contractor data
                    const contractor = await this.databaseService.contractor.findFirstOrThrow({
                        where: { id: jobContractorData.contractorId }
                    });

                    // Prepare template data for email
                    const templateData = {
                        user_name: contractor.name,
                        subject: subject
                    };

                    // Send emails with template and attachments
                    await this.sendgridService.sendEmailWithTemplate(
                        contractor.email,
                        this.config.get('CONTRACTOR_FILE_MAIL_ID'),
                        templateData,
                        attachments,
                        replyTo,
                        sendCC,
                        ccMail
                    );
                }));

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
