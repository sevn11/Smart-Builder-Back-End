import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { ProjectEstimatorTemplateService } from './project-estimator-template.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';

import { ProjectEstimatorTemplateNameDTO } from './validators/templateName';
import { ProjectEstimatorTemplateHeaderDTO } from './validators/header';
import { ProjectEstimatorTemplateDTO } from './validators/add-project-estimator-template';
import { ProjectEstimatorAccountingTemplateDTO } from './validators/add-project-estimator-accounting';
import { BulkUpdateProjectEstimatorTemplateDTO } from './validators/pet-bulk-update'
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

    @Post('/:templateId/bulk-update')
    @HttpCode(HttpStatus.OK)
    bulkUpdateEstimator(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: BulkUpdateProjectEstimatorTemplateDTO[]
    ) {
        return this.projectEstimatorTemplateService.projectEstimatorBulkUpdate(user, templateId, body);
    }

    @Patch('/estimator/:estimatorId')
    @HttpCode(HttpStatus.OK)
    updateTemplateData(
        @GetUser() user: User,
        @Param('estimatorId', ParseIntPipe) estimatorId: number,
        @Body() body: ProjectEstimatorTemplateDTO
    ) {
        return this.projectEstimatorTemplateService.updateTemplateData(user, estimatorId, body);
    }

    // create project estimator template name
    @Post('/create-template')
    @HttpCode(HttpStatus.OK)
    createProjectEstimatorTemplateName(
        @GetUser() user: User,
        @Body() body: ProjectEstimatorTemplateNameDTO
    ) {
        return this.projectEstimatorTemplateService.addProjectEstimatorTemplateName(user, body)
    }

    // get the created template names.
    @Get('/template-name')
    @HttpCode(HttpStatus.OK)
    getTemplateName(@GetUser() user: User) {
        return this.projectEstimatorTemplateService.getProjectEstimatorTemplateName(user);
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
    @Delete(':templateId/header/:headerId')
    @HttpCode(HttpStatus.OK)
    deleteHeader(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('headerId', ParseIntPipe) headerId: number,
    ) {
        return this.projectEstimatorTemplateService.deleteHeader(user, templateId, headerId);
    }

    //edit project estimator header
    @Patch(':templateId/header/:headerId')
    @HttpCode(HttpStatus.OK)
    editHeader(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('headerId', ParseIntPipe) headerId: number,
        @Body() body: ProjectEstimatorTemplateHeaderDTO
    ) {
        return this.projectEstimatorTemplateService.editHeader(user, templateId, headerId, body)
    }

    @Delete(':templateId/estimator/:estimatorId')
    @HttpCode(HttpStatus.OK)
    deleteProjectEstimator(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('estimatorId', ParseIntPipe) estimatorId: number
    ) {
        return this.projectEstimatorTemplateService.deleteProjectEstimator(user, templateId, estimatorId);
    }

    @Post('/:templateId/accounting')
    @HttpCode(HttpStatus.OK)
    createProjectEstimatorAccount(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: ProjectEstimatorAccountingTemplateDTO
    ) {
        return this.projectEstimatorTemplateService.createProjectEstimatorAccount(user, templateId, body)
    }
}
