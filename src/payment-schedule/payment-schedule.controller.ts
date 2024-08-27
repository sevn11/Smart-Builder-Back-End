import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { PaymentScheduleService } from './payment-schedule.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { PaymentScheduleDrawDTO } from './validators/draw';
import { PaymentScheduleDepositDTO } from './validators/deposit';

@UseGuards(JwtGuard)
@Controller('companies/:companyId/jobs/:jobId/payment-schedule')

export class PaymentScheduleController {
    constructor(private paymentScheduleService: PaymentScheduleService) {}

    // get payment schedules (deposit + draws)
    @Get()
    @HttpCode(HttpStatus.OK)
    getPaymentSchedules(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number
    ) {
        return this.paymentScheduleService.getPaymentSchedules(user, companyId, jobId);
    }

    // insert deposit data
    @Post('/deposit')
    @HttpCode(HttpStatus.OK)
    insertDeposit(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number , 
        @Body() body: PaymentScheduleDepositDTO
    ) {
        return this.paymentScheduleService.insertDeposit(user, companyId, jobId, body);
    }

    // edit deposit data
    @Patch('/deposit/:id')
    @HttpCode(HttpStatus.OK)
    updateDeposit(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number, 
        @Param('id', ParseIntPipe) id: number, 
        @Body() body: PaymentScheduleDepositDTO
    ) {
        return this.paymentScheduleService.updateDeposit(user, companyId, jobId, id, body);
    }

    // insert draw
    @Post('/deposit/:depoId/draw')
    @HttpCode(HttpStatus.OK)
    insertDraw(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number , 
        @Param('depoId', ParseIntPipe) depoId: number , 
        @Body() body: PaymentScheduleDrawDTO
    ) {
        return this.paymentScheduleService.insertDraw(user, companyId, jobId, depoId, body);
    }

    // edit drow data
    @Patch('/deposit/:depoId/draw/:drawId')
    @HttpCode(HttpStatus.OK)
    updateDraw(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number, 
        @Param('depoId', ParseIntPipe) depoId: number, 
        @Param('drawId', ParseIntPipe) drawId: number, 
        @Body() body: PaymentScheduleDrawDTO
    ) {
        return this.paymentScheduleService.updateDraw(user, companyId, jobId, depoId, drawId, body);
    }

     // delete drow data
     @Delete('/deposit/:depoId/draw/:drawId')
     @HttpCode(HttpStatus.OK)
     deleteDraw(
         @GetUser() user: User,
         @Param('companyId', ParseIntPipe) companyId: number,
         @Param('jobId', ParseIntPipe) jobId: number, 
         @Param('depoId', ParseIntPipe) depoId: number, 
         @Param('drawId', ParseIntPipe) drawId: number
     ) {
         return this.paymentScheduleService.deleteDraw(user, companyId, jobId, depoId, drawId);
     }
}
