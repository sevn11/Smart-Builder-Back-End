import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { GetUser } from 'src/core/decorators';
import { JwtGuard } from 'src/core/guards';
import { CashFlowService } from './cash-flow.service';
import { CashFlowDTO } from './validators/cash-flow';

@UseGuards(JwtGuard)
@Controller('companies/:id/')
export class CashFlowController {
    constructor(private cashFlowService: CashFlowService) {}

    // get cash flow data
    @HttpCode(HttpStatus.OK)
    @Get('cash-flow')
    getCashFlowProjects(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number) {
        return this.cashFlowService.getCashFlowProjects(user, companyId);
    }

    // save cash flow data
    @HttpCode(HttpStatus.OK)
    @Post('cash-flow-data')
    saveCashFlow(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number, @Body() body: CashFlowDTO) {
        return this.cashFlowService.saveCashFlow(user, companyId, body);
    }
}
