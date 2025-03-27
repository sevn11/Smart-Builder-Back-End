import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { existsSync, renameSync } from 'fs';
import { mkdir, readFile, unlink, writeFile, rm } from 'fs/promises';
import { join, normalize } from 'path';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { ContractorFolderDTO } from './validators/contractor-folder';

import { ContractorFileDTO } from './validators/contractor-file';
import { UpdateContractorFileDTO } from './validators/update-contractor-file';

@Injectable()
export class ContractorFileService {

    constructor(private databaseService: DatabaseService) { }

    async uploadContractorFiles(files: Array<Express.Multer.File>, user: User, companyId: number, jobId: number, body: ContractorFileDTO) {

        try {

            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // check company exist or not
                const company = await this.databaseService.company.findFirstOrThrow({
                    where: {
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
                const { parentFolderPath } = body;


                // Destination folder dynamically based on params
                const basePath = `uploads/companies/${company.id}/customers/${customer.id}/jobs/${jobId}/files`;

                // Ensure the directory exists, create it if it's not
                await mkdir(basePath, { recursive: true });
                const uploadedFiles = [];


                for (const file of files) {

                    const filePath = parentFolderPath && parentFolderPath !== null && parentFolderPath !== undefined
                        ? normalize(join(basePath, parentFolderPath, file.originalname)).replace(/\\/g, '/')
                        : normalize(join(basePath, file.originalname)).replace(/\\/g, '/');

                    if (await existsSync(filePath)) {
                        throw new ConflictException(`File ${file.originalname} already uploaded.`);
                    }
                    else {
                        // Write the file to disk
                        await writeFile(filePath, new Uint8Array(file.buffer));

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
                                    isDirectory: false

                                }
                            });

                            uploadedFiles.push({
                                id: uploadedFile.id,
                                name: uploadedFile.fileName,
                                path: uploadedFile.filePath.replace(/\\/g, '/').split('/files')[1] || '',
                                updatedAt: uploadedFile.updatedAt,
                                isDirectory: uploadedFile.isDirectory
                            });
                        } else {
                            throw new NotFoundException(ResponseMessages.FILE_NOT_UPLOADED);
                        }
                    }
                }

                return (uploadedFiles);

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


    async getUploadedFiles(user: User, companyId: number, jobId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // check company exist or not
                const company = await this.databaseService.company.findFirstOrThrow({
                    where: {
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

                // Fetch files and sort by creation date
                const files = await this.databaseService.contractorFiles.findMany({
                    where: {
                        companyId: companyId,
                        customerId: job.customerId,
                        jobId: jobId
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                });

                // Normalize file paths if necessary
                for (const file of files) {
                    const normalizedFilePath = file.filePath.replace(/\\/g, '/');
                    if (normalizedFilePath !== file.filePath) {
                        await this.databaseService.contractorFiles.update({
                            where: { id: file.id },
                            data: { filePath: normalizedFilePath }
                        });
                        file.filePath = normalizedFilePath;
                    }
                }

                return files.map(file => {
                    const fileData = {
                        id: file.id,
                        name: file.fileName,
                        path: file.filePath.replace(/\\/g, '/').split('/files')[1] || '',
                        isDirectory: file.isDirectory,
                        updateAt: file.updatedAt
                    };


                    return fileData;
                });
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


                // Check if the file/folder exists on disk
                if (existsSync(file.filePath)) {
                    if (file.isDirectory) {
                        // If it's a directory, delete recursively
                        await rm(file.filePath, { recursive: true, force: true });
                    } else {
                        // If it's a file, delete it
                        await unlink(file.filePath);
                    }
                }

                if (file.isDirectory) {
                    // Find and delete all files and folders inside this directory in the database
                    const filesToDelete = await this.databaseService.contractorFiles.findMany({
                        where: {
                            companyId: companyId,
                            filePath: {
                                startsWith: file.filePath
                            }
                        }
                    });


                    for (const nestedFile of filesToDelete) {
                        await this.databaseService.contractorFiles.delete({
                            where: { id: nestedFile.id }
                        });
                    }
                } else {

                    await this.databaseService.contractorFiles.delete({
                        where: { id: fileId }
                    });
                }

                return { message: 'Deleted successfully.' };
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

    async createFolder(user: User, companyId: number, jobId: number, body: ContractorFolderDTO) {
        try {
            const { name, parentFolder } = body;

            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // check company exist or not
                const company = await this.databaseService.company.findFirstOrThrow({
                    where: {
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

                // Validate folder name for invalid characters
                const invalidChars = /[<>:"/\\|?*]/;
                if (invalidChars.test(name)) {
                    throw new BadRequestException('Folder name contains invalid characters.');
                }

                // Construct the base path and full folder path
                const basePath = `uploads/companies/${companyId}/customers/${customer.id}/jobs/${jobId}/files`;
                const newFolderPath = parentFolder && parentFolder.path && parentFolder.path != null
                    ? normalize(join(basePath, parentFolder.path, name)).replace(/\\/g, '/')
                    : normalize(join(basePath, name)).replace(/\\/g, '/');


                // Check if the folder path already exists in the database
                const folderExists = await this.databaseService.contractorFiles.findFirst({
                    where: {
                        filePath: newFolderPath, // Exact path check
                        companyId: company.id,
                        jobId: job.id,
                        customerId: customer.id,
                        isDirectory: true,
                    },
                });

                if (folderExists) {
                    throw new ConflictException('Folder already exists.');
                }

                // Create the directory on the filesystem
                if (!existsSync(newFolderPath)) {
                    await mkdir(newFolderPath, { recursive: true });

                    // Add the folder entry to the database
                    const newFolder = await this.databaseService.contractorFiles.create({
                        data: {
                            companyId: company.id,
                            customerId: customer.id,
                            jobId: job.id,
                            fileName: name,
                            filePath: newFolderPath,
                            isDirectory: true,

                        },
                    });

                    return {
                        message: 'Folder created successfully.',
                        folder: {
                            id: newFolder.id,
                            name: newFolder.fileName,
                            path: newFolder.filePath.replace(/\\/g, '/').split('/files')[1] || '',
                            isDirectory: newFolder.isDirectory,
                            updatedAt: newFolder.updatedAt
                        },
                    };
                } else {
                    throw new ConflictException('Folder already exists.');
                }
            }
        } catch (error) {
            console.error("Error in createFolder:", error);

            if (error instanceof ConflictException) {
                throw new ConflictException(error.message);
            }

            if (error instanceof BadRequestException) {
                throw new BadRequestException(error.message);
            }

            if (error instanceof ForbiddenException) {
                throw new ForbiddenException(error.message);
            }

            throw new InternalServerErrorException(
                error.message || "An error occurred while creating the folder."
            );
        }
    }

    async updateContractorFiles(user: User, companyId: number, jobId: number, body: UpdateContractorFileDTO, fileId) {
        try {
            const { name } = body;

            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // check company exist or not
                const company = await this.databaseService.company.findFirstOrThrow({
                    where: {
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

                // Validate name for invalid characters
                const invalidChars = /[<>:"/\\|?*]/;
                if (invalidChars.test(name)) {
                    throw new BadRequestException("Name contains invalid characters.");
                }

                // Fetch the file or folder from the database
                let file = await this.databaseService.contractorFiles.findFirst({
                    where: { id: fileId, jobId, companyId }
                });

                if (!file) {
                    throw new NotFoundException("File or Folder not found.");
                }

                // Normalize backslashes to forward slashes
                const normalizedFilePath = file.filePath.replace(/\\/g, '/');

                // Update the database if normalization was needed
                if (normalizedFilePath !== file.filePath) {
                    file = await this.databaseService.contractorFiles.update({
                        where: { id: fileId },
                        data: { filePath: normalizedFilePath }
                    });
                }




                let updatedName = name;
                let newFilePath: string;


                if (!file.isDirectory) {
                    // If it's a file, preserve the extension
                    const nameParts = file.fileName.split(".");
                    if (nameParts.length > 1) {
                        nameParts[0] = name;
                        updatedName = nameParts.join(".");
                    }
                }

                // Construct new file path
                const fileDir = file.filePath.substring(0, file.filePath.lastIndexOf("/"));
                newFilePath = join(fileDir, updatedName).replace(/\\/g, '/');

                // Check in File System: Ensure no file/folder exists with the new name
                if (existsSync(newFilePath)) {
                    throw new ConflictException(
                        file.isDirectory
                            ? 'A folder with this name already exists.'
                            : 'A file with this name already exists.'
                    );
                }

                // Check if the file/folder exists on disk before renaming
                if (existsSync(file.filePath)) {
                    renameSync(file.filePath, newFilePath); // Rename on the file system
                } else {
                    console.warn(`File or directory does not exist: ${file.filePath}`);
                }

                const existingItem = await this.databaseService.contractorFiles.findFirst({
                    where: {
                        fileName: updatedName,
                        filePath: {
                            startsWith: fileDir
                        },
                        companyId,
                        jobId,
                        isDirectory: file.isDirectory
                    }
                });

                if (existingItem) {
                    throw new ConflictException(
                        file.isDirectory
                            ? 'A folder with this name already exists.'
                            : 'A file with this name already exists.'
                    );
                }

                // Handle folders (update all affected file paths)
                if (file.isDirectory) {
                    // Find all files and folders under the same company and job
                    const allFiles = await this.databaseService.contractorFiles.findMany({
                        where: { companyId, jobId }
                    });

                    // Find all items whose paths contain the folder name
                    const affectedFiles = allFiles.filter(f => f.filePath.includes(file.fileName));

                    for (const child of affectedFiles) {
                        // Split the path and find the index where the folder name appears
                        const pathParts = child.filePath.split("/");
                        const folderIndex = pathParts.indexOf(file.fileName);

                        if (folderIndex !== -1) {
                            // Replace the folder name with the new name
                            pathParts[folderIndex] = updatedName;
                            const newChildPath = pathParts.join("/");

                            if (existsSync(child.filePath)) {
                                renameSync(child.filePath, newChildPath);
                            }

                            // Update database with the new path
                            await this.databaseService.contractorFiles.update({
                                where: { id: child.id },
                                data: { filePath: newChildPath }
                            });
                        }
                    }
                }

                // Update the file/folder name in the database
                const updatedFile = await this.databaseService.contractorFiles.update({
                    where: { id: fileId },
                    data: { fileName: updatedName, filePath: newFilePath }
                });

                // Fetch files and sort by creation date
                const files = await this.databaseService.contractorFiles.findMany({
                    where: {
                        companyId: companyId,
                        customerId: job.customerId,
                        jobId: jobId
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                });

                return files.map(file => {
                    const fileData = {
                        id: file.id,
                        name: file.fileName,
                        path: file.filePath.replace(/\\/g, '/').split('/files')[1] || '',
                        isDirectory: file.isDirectory,
                        updateAt: file.updatedAt
                    };

                    return fileData;

                })
            }
        } catch (error) {
            console.error("Error in createFolder:", error);

            if (error instanceof ConflictException) {
                throw new ConflictException(error.message);
            }

            if (error instanceof BadRequestException) {
                throw new BadRequestException(error.message);
            }

            if (error instanceof ForbiddenException) {
                throw new ForbiddenException(error.message);
            }

            throw new InternalServerErrorException(
                error.message || "An error occurred while creating the folder."
            );
        }
    }

}

