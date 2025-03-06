import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { JobContractorService } from './job-contractor.service';
import { JobContractorDTO } from './validators/job-contractor';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { SendInfoToContractorDTO } from './validators/send-info-mail';

@UseGuards(JwtGuard)
@Controller('companies/:companyId/jobs/:jobId/jobcontractor')
export class JobContractorController {

    constructor(private jobContractorService: JobContractorService) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    createJobcontractor(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number , @Body() body: JobContractorDTO) {
        return this.jobContractorService.createJobcontractor(user, companyId, jobId, body)
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    getAllJobContractors(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number) {
        return this.jobContractorService.getAllJobContractors(user, companyId, jobId);
    }

    @Delete('/:jobContractorId')
    @HttpCode(HttpStatus.OK)
    deletejobContractor(@GetUser() user: User,  @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number, @Param('jobContractorId', ParseIntPipe) jobContractorId: number) {
        return this.jobContractorService.deletejobContractor(user, companyId, jobId, jobContractorId);
    }
    
    @Post('/send-info-mail')
    @HttpCode(HttpStatus.OK)
    sendInfoMail(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number, @Body() body: SendInfoToContractorDTO) {
        return this.jobContractorService.sendInfoMail(user, companyId, jobId, body);
    }
    
    @Get('/:rowId/details')
    @HttpCode(HttpStatus.OK)
    getJobContractorDetails(
        @GetUser() user: User, 
        @Param('companyId', ParseIntPipe) companyId: number, 
        @Param('jobId', ParseIntPipe) jobId: number,
        @Param('rowId', ParseIntPipe) rowId: number,
    ) {
        return this.jobContractorService.getJobContractorDetails(user, companyId, jobId, rowId);
    }
}
