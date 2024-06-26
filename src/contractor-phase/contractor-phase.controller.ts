import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { ContractorPhaseService } from './contractor-phase.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { ContractorPhaseDTO } from './validators/contractor-phase';


@UseGuards(JwtGuard)
@Controller('companies/:companyId/contractor-phase')
export class ContractorPhaseController {
    constructor(private contractorPhaseService: ContractorPhaseService) {}
    
    @Get()
    @HttpCode(HttpStatus.OK)
    getAllContractors(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number) {
        return this.contractorPhaseService.getAllPhases(user, companyId);
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    createPhase(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Body() body: ContractorPhaseDTO) {
        return this.contractorPhaseService.createPhase(user, companyId, body);
    }

    @Patch('/:phaseId')
    @HttpCode(HttpStatus.OK)
    updateContractorDetails(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('phaseId', ParseIntPipe) phaseId: number, @Body() body: ContractorPhaseDTO) {
        return this.contractorPhaseService.updatePhase(user, companyId, phaseId, body);
    }

    @Delete('/:phaseId')
    @HttpCode(HttpStatus.OK)
    deleteContractor(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('phaseId', ParseIntPipe) phaseId: number) {
        return this.contractorPhaseService.deletePhase(user, companyId, phaseId);
    }
}
