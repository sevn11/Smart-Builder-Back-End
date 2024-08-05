import { Controller, Delete, Get, Param, ParseIntPipe, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { ContractorFileService } from './contractor-file.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { User } from '@prisma/client';
import { GetUser } from 'src/core/decorators';

@UseGuards(JwtGuard)
@Controller('companies/:companyId/jobs/:jobId/contractor-file')
export class ContractorFileController {
    constructor(private contractorFileService: ContractorFileService) {}

    // upload files
    @Post()
    @UseInterceptors(FilesInterceptor('files'))
    uploadContractorFiles(@UploadedFiles() files: Array<Express.Multer.File>,@GetUser() user:User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number) {
        return this.contractorFileService.uploadContractorFiles(files, user, companyId, jobId);
    }
    
    // get all uploaded files based on company, customer and job
    @Get()
    getUploadedFiles(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number) {
        return this.contractorFileService.getUploadedFiles(user, companyId, jobId);
    }

    // delete a particular
    @Delete('/:fileId')
    deleteUploadedFile(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number, @Param('fileId', ParseIntPipe) fileId: number) {
        return this.contractorFileService.deleteUploadedFile(user, companyId, jobId, fileId);
    }

    // get a single file
    @Get('/:fileId')
    getSingleFile(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number, @Param('fileId', ParseIntPipe) fileId: number) {
        return this.contractorFileService.getSingleFile(user, companyId, jobId, fileId);
    }
}
