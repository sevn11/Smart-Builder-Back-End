import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { ContractorFileService } from './contractor-file.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { User } from '@prisma/client';
import { GetUser } from 'src/core/decorators';
import { ContractorFolderDTO } from './validators/contractor-folder';
import { ContractorFileDTO } from './validators/contractor-file';
import { UpdateContractorFileDTO } from './validators/update-contractor-file';

@UseGuards(JwtGuard)
@Controller('companies/:companyId/jobs/:jobId/contractor-file')
export class ContractorFileController {
    constructor(private contractorFileService: ContractorFileService) { }

    @Post()
    @UseInterceptors(FilesInterceptor('files'))
    uploadContractorFiles(@UploadedFiles() files: Array<Express.Multer.File>, @GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number, @Body() body: ContractorFileDTO) {

        return this.contractorFileService.uploadContractorFiles(files, user, companyId, jobId, body);
    }

    @Get()
    getUploadedFiles(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number) {
        return this.contractorFileService.getUploadedFiles(user, companyId, jobId);
    }


    @Delete('/:fileId')
    deleteUploadedFile(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number, @Param('fileId', ParseIntPipe) fileId: number) {
        return this.contractorFileService.deleteUploadedFile(user, companyId, jobId, fileId);
    }

    @Get('/:fileId')
    getSingleFile(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number, @Param('fileId', ParseIntPipe) fileId: number) {
        return this.contractorFileService.getSingleFile(user, companyId, jobId, fileId);
    }

    @Post('create-folder')
    createFolder(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number, @Body() body: ContractorFolderDTO) {
        return this.contractorFileService.createFolder(user, companyId, jobId, body);
    }

    @Patch('/:fileId')
    updateContractorFiles(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number, @Body() body: UpdateContractorFileDTO, @Param('fileId', ParseIntPipe) fileId: number) {
        return this.contractorFileService.updateContractorFiles(user, companyId, jobId, body, fileId);
    }
}
