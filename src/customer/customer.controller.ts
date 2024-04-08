import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { JwtGuard } from 'src/core/guards';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { AddCustomerDTO } from './validators';


@UseGuards(JwtGuard)
@Controller('companies/:companyId/customers')
export class CustomerController {

    constructor(private customerService: CustomerService) {

    }

    @Get()
    @HttpCode(HttpStatus.OK)
    getCustomerList(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number) {
        return this.customerService.getCustomerList(user, companyId);
    }


    @Post()
    createCustomer(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Body() body: AddCustomerDTO) {
        return this.customerService.createCustomer(user, companyId, body);
    }


    @Get(':customerId')
    @HttpCode(HttpStatus.OK)
    getCustomerDetails(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('customerId', ParseIntPipe) customerId: number) {
        return this.customerService.getCustomerDetails(user, companyId, customerId);
    }



}
