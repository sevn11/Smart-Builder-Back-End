import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { ProjectEstimatorTemplateService } from './project-estimator-template.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';

import { ProjectEstimatorTemplateNameDTO } from './validators/templateName';
import { ProjectEstimatorTemplateHeaderDTO } from './validators/header';
import { ProjectEstimatorTemplateDTO } from './validators/add-project-estimator-template';
import { ProjectEstimatorAccountingTemplateDTO } from './validators/add-project-estimator-accounting';
import { BulkUpdateProjectEstimatorTemplateDTO } from './validators/pet-bulk-update'
import { ItemOrderDTO } from './validators/item-order';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(JwtGuard)
@Controller('project-estimator-template')
export class ProjectEstimatorTemplateController {
    constructor(private projectEstimatorTemplateService: ProjectEstimatorTemplateService) { }

    @Get('/:templateId/companies/:companyId/data')
    @HttpCode(HttpStatus.OK)
    getTemplateData(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('templateId', ParseIntPipe) templateId: number
    ) {
        return this.projectEstimatorTemplateService.getTemplateData(user, companyId, templateId)
    }

    @Post('/:templateId/companies/:companyId/data')
    @HttpCode(HttpStatus.OK)
    createTemplateData(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: ProjectEstimatorTemplateDTO
    ) {
        return this.projectEstimatorTemplateService.createTemplateData(user, companyId, templateId, body)
    }

    @Post(':companyId/:templateId/bulk-update')
    @HttpCode(HttpStatus.OK)
    bulkUpdateEstimator(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Body() body: BulkUpdateProjectEstimatorTemplateDTO[]
    ) {
        return this.projectEstimatorTemplateService.projectEstimatorBulkUpdate(user, companyId, templateId, body);
    }

    @Patch(':companyId/estimator/:estimatorId')
    @HttpCode(HttpStatus.OK)
    updateTemplateData(
        @GetUser() user: User,
        @Param('estimatorId', ParseIntPipe) estimatorId: number,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Body() body: ProjectEstimatorTemplateDTO
    ) {
        return this.projectEstimatorTemplateService.updateTemplateData(user, companyId, estimatorId, body);
    }

    // create project estimator template name
    @Post(':companyId/create-template')
    @HttpCode(HttpStatus.OK)
    createProjectEstimatorTemplateName(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Body() body: ProjectEstimatorTemplateNameDTO
    ) {
        return this.projectEstimatorTemplateService.addProjectEstimatorTemplateName(user, companyId, body)
    }

    // update project estimator template name
    @Patch(':companyId/edit-template/:templateId')
    @HttpCode(HttpStatus.OK)
    updateProjectEstimatorTemplate(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Body() body: ProjectEstimatorTemplateNameDTO
    ) {
        return this.projectEstimatorTemplateService.updateProjectEstimatorTemplate(user, companyId, templateId, body)
    }

    // delete project estimator template name
    @Delete(':companyId/delete-template/:templateId')
    @HttpCode(HttpStatus.OK)
    deleteProjectEstimatorTemplate(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('companyId', ParseIntPipe) companyId: number,
    ) {
        return this.projectEstimatorTemplateService.deleteProjectEstimatorTemplate(user, companyId, templateId)
    }

    // get the created template names.
    @Get(':companyId/template-name')
    @HttpCode(HttpStatus.OK)
    getTemplateName(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
    ) {
        return this.projectEstimatorTemplateService.getProjectEstimatorTemplateName(user, companyId);
    }

    // create template name header.
    @Post('/companies/:companyId/create-header')
    @HttpCode(HttpStatus.OK)
    createTemplateHeader(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Body() body: ProjectEstimatorTemplateHeaderDTO
    ) {
        return this.projectEstimatorTemplateService.createHeader(user, companyId, body);
    }

    // delete project estimator header
    @Delete(':companyId/:templateId/header/:headerId')
    @HttpCode(HttpStatus.OK)
    deleteHeader(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('headerId', ParseIntPipe) headerId: number,
        @Param('companyId', ParseIntPipe) companyId: number,
    ) {
        return this.projectEstimatorTemplateService.deleteHeader(user, companyId, templateId, headerId);
    }

    //edit project estimator header
    @Patch(':companyId/:templateId/header/:headerId')
    @HttpCode(HttpStatus.OK)
    editHeader(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('headerId', ParseIntPipe) headerId: number,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Body() body: ProjectEstimatorTemplateHeaderDTO
    ) {
        return this.projectEstimatorTemplateService.editHeader(user, companyId, templateId, headerId, body)
    }

    @Delete(':companyId/:templateId/estimator/:estimatorId')
    @HttpCode(HttpStatus.OK)
    deleteProjectEstimator(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('estimatorId', ParseIntPipe) estimatorId: number,
        @Param('companyId', ParseIntPipe) companyId: number,
    ) {
        return this.projectEstimatorTemplateService.deleteProjectEstimator(user, companyId, templateId, estimatorId);
    }

    @Post(':companyId/:templateId/accounting')
    @HttpCode(HttpStatus.OK)
    createProjectEstimatorAccount(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Body() body: ProjectEstimatorAccountingTemplateDTO
    ) {
        return this.projectEstimatorTemplateService.createProjectEstimatorAccount(user, companyId, templateId, body)
    }

    @Patch(':templateId/companies/:companyId/sort-item')
    @HttpCode(HttpStatus.OK)
    reorderItem(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Body() body: ItemOrderDTO
    ) {
        return this.projectEstimatorTemplateService.reorderItem(user, templateId, companyId, body)
    }

    @Post(':companyId/import-template')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: 30 * 1024 * 1024 }, // Limit file size to 10MB
            fileFilter: (req, file, cb) => {
                if (file.mimetype !== 'text/csv') {
                    return cb(new BadRequestException('Only CSV files are allowed!'), false);
                }
                cb(null, true);
            },
        }),
    )
    importTemplate(
        @GetUser() user: User,
        @UploadedFile() file: Express.Multer.File,
        @Body() body: { templateId: string },
        @Param('companyId', ParseIntPipe) companyId: number,
    ) {
        return this.projectEstimatorTemplateService.importTemplate(user, file, body, companyId);
    }
}
