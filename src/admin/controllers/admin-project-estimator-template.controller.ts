import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';

import { ProjectEstimatorTemplateNameDTO } from '../validators/project-estimator/templateName';
import { ProjectEstimatorTemplateHeaderDTO } from '../validators/project-estimator/header';
import { ProjectEstimatorTemplateDTO } from '../validators/project-estimator/add-project-estimator-template';
import { ProjectEstimatorAccountingTemplateDTO } from '../validators/project-estimator/add-project-estimator-accounting';
import { BulkUpdateProjectEstimatorTemplateDTO } from '../validators/project-estimator/pet-bulk-update'
import { ItemOrderDTO } from '../validators/project-estimator/item-order';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfitCalculationTypeEnum } from 'src/core/utils/profit-calculation';
import { AdminProjectEstimatorTemplateService } from '../services/admin-project-estimator-template.service';

@UseGuards(JwtGuard)
@Controller('admin/master-project-estimator-template')
export class ProjectEstimatorTemplateController {
    constructor(private adminProjectEstimatorTemplateService: AdminProjectEstimatorTemplateService) { }
    
    @Get('/:templateId/data') 
    @HttpCode(HttpStatus.OK)
    getTemplateData(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number
    ) {
        return this.adminProjectEstimatorTemplateService.getTemplateData(user, templateId)
    }

    @Post('/:templateId/data')
    @HttpCode(HttpStatus.OK)
    createTemplateData(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: ProjectEstimatorTemplateDTO
    ) {
        return this.adminProjectEstimatorTemplateService.createTemplateData(user, templateId, body)
    }

    @Post('/:templateId/bulk-update')
    @HttpCode(HttpStatus.OK)
    bulkUpdateEstimator(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: BulkUpdateProjectEstimatorTemplateDTO[]
    ) {
        return this.adminProjectEstimatorTemplateService.projectEstimatorBulkUpdate(user, templateId, body);
    }

    @Patch('/estimator/:estimatorId')
    @HttpCode(HttpStatus.OK)
    updateTemplateData(
        @GetUser() user: User,
        @Param('estimatorId', ParseIntPipe) estimatorId: number,
        @Body() body: ProjectEstimatorTemplateDTO
    ) {
        return this.adminProjectEstimatorTemplateService.updateTemplateData(user, estimatorId, body);
    }

    // create project estimator template name
    @Post('/create-template')
    @HttpCode(HttpStatus.OK)
    createProjectEstimatorTemplateName(
        @GetUser() user: User,
        @Body() body: ProjectEstimatorTemplateNameDTO
    ) {
        return this.adminProjectEstimatorTemplateService.addProjectEstimatorTemplateName(user, body)
    }

    // update project estimator template name
    @Patch('/edit-template/:templateId')
    @HttpCode(HttpStatus.OK)
    updateProjectEstimatorTemplate(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: ProjectEstimatorTemplateNameDTO
    ) {
        return this.adminProjectEstimatorTemplateService.updateProjectEstimatorTemplate(user, templateId, body)
    }

    // delete project estimator template name
    @Delete('/delete-template/:templateId')
    @HttpCode(HttpStatus.OK)
    deleteProjectEstimatorTemplate(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
    ) {
        return this.adminProjectEstimatorTemplateService.deleteProjectEstimatorTemplate(user, templateId)
    }

    // get the created template names.
    @Get('/template-name')
    @HttpCode(HttpStatus.OK)
    getTemplateName(
        @GetUser() user: User,
    ) {
        return this.adminProjectEstimatorTemplateService.getProjectEstimatorTemplateName(user);
    }

    // create template name header.
    @Post('/create-header')
    @HttpCode(HttpStatus.OK)
    createTemplateHeader(
        @GetUser() user: User,
        @Body() body: ProjectEstimatorTemplateHeaderDTO
    ) {
        return this.adminProjectEstimatorTemplateService.createHeader(user, body);
    }

    // delete project estimator header
    @Delete('/:templateId/header/:headerId')
    @HttpCode(HttpStatus.OK)
    deleteHeader(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('headerId', ParseIntPipe) headerId: number,
    ) {
        return this.adminProjectEstimatorTemplateService.deleteHeader(user, templateId, headerId);
    }

    //edit project estimator header
    @Patch('/:templateId/header/:headerId')
    @HttpCode(HttpStatus.OK)
    editHeader(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('headerId', ParseIntPipe) headerId: number,
        @Body() body: ProjectEstimatorTemplateHeaderDTO
    ) {
        return this.adminProjectEstimatorTemplateService.editHeader(user, templateId, headerId, body)
    }

    @Delete('/:templateId/estimator/:estimatorId')
    @HttpCode(HttpStatus.OK)
    deleteProjectEstimator(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('estimatorId', ParseIntPipe) estimatorId: number,
    ) {
        return this.adminProjectEstimatorTemplateService.deleteProjectEstimator(user, templateId, estimatorId);
    }

    @Post('/:templateId/accounting')
    @HttpCode(HttpStatus.OK)
    createProjectEstimatorAccount(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: ProjectEstimatorAccountingTemplateDTO
    ) {
        return this.adminProjectEstimatorTemplateService.createProjectEstimatorAccount(user, templateId, body)
    }

    @Patch(':templateId/sort-item')
    @HttpCode(HttpStatus.OK)
    reorderItem(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: ItemOrderDTO
    ) {
        return this.adminProjectEstimatorTemplateService.reorderItem(user, templateId, body)
    }

    @Post('/import-template')
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
    ) {
        return this.adminProjectEstimatorTemplateService.importTemplate(user, file, body);
    }

    @Patch('/:templateId/update/profit-calculation-type')
    @HttpCode(HttpStatus.OK)
    updateTemplateProfitCalculationType(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: { profitCalculationType: ProfitCalculationTypeEnum }
    ) {
        return this.adminProjectEstimatorTemplateService.updateTemplateProfitCalculationType(user, templateId, body);
    }
}
