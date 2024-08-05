import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { JobProjectEstimatorService } from './job-project-estimator.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { JobProjectEstimatorHeaderDTO } from './validators/add-header';
import { JobProjectEstimatorDTO } from './validators/add-project-estimator';
import { JobProjectEstimatorAccountingDTO } from './validators/add-project-estimator-accounting';
import { BulkUpdateProjectEstimatorDTO } from './validators/pe-bulk-update';

@UseGuards(JwtGuard)
@Controller('companies/:companyId/jobs/:jobId/job-project-estimator')
export class JobProjectEstimatorController {

    constructor(private jobProjectEstimatorService: JobProjectEstimatorService) {}

    // get all project estimator data
    @Get()
    @HttpCode(HttpStatus.OK)
    getProjectEstimatorData(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number
    ) {
        return this.jobProjectEstimatorService.getProjectEstimatorData(user, companyId, jobId);
    }

    // create new header for project estimator
    @Post('/header')
    @HttpCode(HttpStatus.OK)
    createHeader(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number , 
        @Body() body: JobProjectEstimatorHeaderDTO
    ) {
        return this.jobProjectEstimatorService.createHeader(user, companyId, jobId, body);
    }

    // edit project estimator header
    @Patch('/header/:headerId')
    @HttpCode(HttpStatus.OK)
    editHeader(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number, 
        @Param('headerId', ParseIntPipe) headerId: number, 
        @Body() body: JobProjectEstimatorHeaderDTO
    ) {
        return this.jobProjectEstimatorService.editHeader(user, companyId, jobId,headerId, body);
    }

    // delete project estimator header
    @Delete('/header/:headerId')
    @HttpCode(HttpStatus.OK)
    deleteHeader(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number, 
        @Param('headerId', ParseIntPipe) headerId: number, 
    ) {
        return this.jobProjectEstimatorService.deleteHeader(user, companyId, jobId, headerId);
    }

    // insert new project estimator data
    @Post('')
    @HttpCode(HttpStatus.OK)
    createProjectEstimator( 
        @GetUser() user: User, 
        @Param('companyId', ParseIntPipe) companyId: number, 
        @Param('jobId', ParseIntPipe) jobId: number, 
        @Body() body: JobProjectEstimatorDTO
    ) {
        return this.jobProjectEstimatorService.createProjectEstimator(user, companyId, jobId, body);
    }

    // edit existing project estimator data
    @Patch('/:projectEstimatorId')
    @HttpCode(HttpStatus.OK)
    updateProjectEstimator( 
        @GetUser() user: User, 
        @Param('companyId', ParseIntPipe) companyId: number, 
        @Param('jobId', ParseIntPipe) jobId: number, 
        @Param('projectEstimatorId', ParseIntPipe) projectEstimatorId: number, 
        @Body() body: JobProjectEstimatorDTO
    ) {
        return this.jobProjectEstimatorService.updateProjectEstimator(user, companyId, jobId, projectEstimatorId, body);
    }

    // delete existing project estimator data
    @Delete('/:projectEstimatorId')
    @HttpCode(HttpStatus.OK)
    deleteProjectEstimator( 
        @GetUser() user: User, 
        @Param('companyId', ParseIntPipe) companyId: number, 
        @Param('jobId', ParseIntPipe) jobId: number, 
        @Param('projectEstimatorId', ParseIntPipe) projectEstimatorId: number
    ) {
        return this.jobProjectEstimatorService.deleteProjectEstimator(user, companyId, jobId, projectEstimatorId);
    }

    // insert new data for Accounting section
    @Post('accounting')
    @HttpCode(HttpStatus.OK)
    createProjectEstimatorAccounting( 
        @GetUser() user: User, 
        @Param('companyId', ParseIntPipe) companyId: number, 
        @Param('jobId', ParseIntPipe) jobId: number, 
        @Body() body: JobProjectEstimatorAccountingDTO
    ) {
        return this.jobProjectEstimatorService.createProjectEstimatorAccounting(user, companyId, jobId, body);
    }

    // bulk update project estimator rows
    @Post('bulk-update')
    @HttpCode(HttpStatus.OK)
    bulkUpdateEstimator(
        @GetUser() user: User, 
        @Param('companyId', ParseIntPipe) companyId: number, 
        @Param('jobId', ParseIntPipe) jobId: number, 
        @Body() body: BulkUpdateProjectEstimatorDTO[]
    ) {
        return this.jobProjectEstimatorService.projectEstimatorBulkUpdate(user, companyId, jobId, body);
    }

    // get all change orders 
    @Get('change-orders')
    @HttpCode(HttpStatus.OK)
    getAllChangeOrders(
        @GetUser() user: User, 
        @Param('companyId', ParseIntPipe) companyId: number, 
        @Param('jobId', ParseIntPipe) jobId: number
    ) {
        return this.jobProjectEstimatorService.getAllChangeOrders(user, companyId, jobId);
    }
}
