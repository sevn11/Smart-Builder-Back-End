import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { ContractorService } from './contractor.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { ContractorDTO } from './validators/contractor';

@UseGuards(JwtGuard)
@Controller('companies/:companyId/contractor')
export class ContractorController {

    constructor(private contractorService: ContractorService) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    createContractor(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Body() body: ContractorDTO) {
        return this.contractorService.createContractor(user, companyId, body);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    getAllContractors(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number) {
        return this.contractorService.getAllContractors(user, companyId);
    }

    @Get('/:contractorId')
    @HttpCode(HttpStatus.OK)
    getContractorDetails(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('contractorId', ParseIntPipe) contractorId: number) {
        return this.contractorService.getContractorDetails(user, companyId, contractorId);
    }

    @Patch('/:contractorId')
    @HttpCode(HttpStatus.OK)
    updateContractorDetails(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('contractorId', ParseIntPipe) contractorId: number, @Body() body: ContractorDTO) {
        return this.contractorService.updateContractor(user, companyId, contractorId, body);
    }

    @Delete('/:contractorId')
    @HttpCode(HttpStatus.OK)
    deleteContractor(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('contractorId', ParseIntPipe) contractorId: number) {
        return this.contractorService.deleteContractor(user, companyId, contractorId);
    }

}
