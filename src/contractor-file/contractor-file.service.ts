import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { existsSync } from 'fs';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ContractorFileService {

    constructor(private databaseService: DatabaseService) {}

    async uploadContractorFiles(files: Array<Express.Multer.File>, user:User, companyId: number, jobId: number) {

        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // check company exist or not
                const company = await this.databaseService.company.findFirstOrThrow({
                    where:{
                        id: companyId
                    }
                });

                // check job exist or not
                const job = await this.databaseService.job.findFirstOrThrow({
                    where: {
                        id: jobId
                    }
                });

                // check customer exist or not
                const customer = await this.databaseService.customer.findFirstOrThrow({
                    where: {
                        id: job.customerId
                    }
                });

                // Destination folder dynamically based on params
                const basePath = `uploads/companies/${company.id}/customers/${customer.id}/jobs/${jobId}/files`;
                
                // Ensure the directory exists, create it if it's not
                await mkdir(basePath, { recursive: true });

                const uploadedFiles = [];
                
                for (const file of files) {

                    // Construct full path for storing the file
                    const filePath = join(basePath, file.originalname);
                    
                    if (await existsSync(filePath)) {
                        throw new ConflictException(`File ${file.originalname} already uploaded.`);
                    }
                    else {
                        // Write the file to disk
                        await writeFile(filePath, file.buffer);

                        // Check again if file was successfully written
                        if (await existsSync(filePath)) {
                            // after storing file in system create an entry in the database
                            const uploadedFile = await this.databaseService.contractorFiles.create({
                              data: {
                                companyId: company.id,
                                customerId: customer.id,
                                jobId: job.id,
                                fileName: file.originalname,
                                filePath: filePath,
                              },
                            });
                  
                            uploadedFiles.push({
                              id: uploadedFile.id,
                              fileName: uploadedFile.fileName,
                              filePath: uploadedFile.filePath,
                            });
                        } else {
                            throw new NotFoundException(ResponseMessages.FILE_NOT_UPLOADED);
                        }
                    }
                  }
          
                  return uploadedFiles;
                
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                  throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                } else {
                  console.error(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException || error instanceof NotFoundException) {
                throw error;
            }
        
            throw new InternalServerErrorException();
        }
    }


    async getUploadedFiles(user:User, companyId: number, jobId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // check company exist or not
                const company = await this.databaseService.company.findFirstOrThrow({
                    where:{
                        id: companyId
                    }
                });

                // check job exist or not
                const job = await this.databaseService.job.findFirstOrThrow({
                    where: {
                        id: jobId
                    }
                });

                // check customer exist or not
                const customer = await this.databaseService.customer.findFirstOrThrow({
                    where: {
                        id: job.customerId
                    }
                });
                
                // get all files under the company and customer
                const files = await this.databaseService.contractorFiles.findMany({
                    where: {
                        companyId: companyId,
                        customerId: job.customerId,
                        jobId: jobId
                    }
                });    
                
                return files.map(file => ({
                    id: file.id,
                    fileName: file.fileName,
                    filePath: file.filePath
                }));

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            throw new InternalServerErrorException();
        }
    }

    async deleteUploadedFile(user: User, companyId: number, jobId: number, fileId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const file = await this.databaseService.contractorFiles.findFirstOrThrow({
                    where: {
                        id: fileId
                    }
                })
                
                // check file exist on server
                if(existsSync(file.filePath)) {
                    // delete file from the disk
                    await unlink(file.filePath);
                }

                // delete file data entry from  database
                await this.databaseService.contractorFiles.delete({
                    where: {
                        id: fileId
                    }
                });

                return { message: ResponseMessages.SUCCESSFUL }
                
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
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

    async getSingleFile(user: User, companyId: number, jobId: number, fileId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const file = await this.databaseService.contractorFiles.findFirstOrThrow({
                    where: {
                        id: fileId
                    }
                });

                // check file exist on server
                if (await existsSync(file.filePath)) {
                    return {
                        id: file.id,
                        fileName: file.fileName,
                        filePath: file.filePath
                    };
                } else {
                    throw new NotFoundException(ResponseMessages.FILE_NOT_FOUND);
                }
                
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                  throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                } else {
                  console.error(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException || error instanceof NotFoundException) {
                throw error;
            }
        
            throw new InternalServerErrorException();
        }
    }
}

