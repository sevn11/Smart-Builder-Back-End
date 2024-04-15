import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { JwtGuard } from 'src/core/guards';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { AddCustomerDTO, SearchCustomerDTO, UpdateCustomerDTO } from './validators';


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


    @Post('/search')
    search(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Body() body: SearchCustomerDTO) {
        return this.customerService.search(user, companyId, body);
    }



    @Get('/:customerId')
    @HttpCode(HttpStatus.OK)
    getCustomerDetails(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('customerId', ParseIntPipe) customerId: number) {
        return this.customerService.getCustomerDetails(user, companyId, customerId);
    }

    @Patch('/:customerId')
    @HttpCode(HttpStatus.OK)
    updateCustomerDetails(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('customerId', ParseIntPipe) customerId: number, @Body() body: UpdateCustomerDTO) {
        return this.customerService.updateCustomerDetails(user, companyId, customerId, body);
    }

    @Delete('/:customerId')
    @HttpCode(HttpStatus.OK)
    deleteCustomer(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('customerId', ParseIntPipe) customerId: number) {
        return this.customerService.deleteCustomer(user, companyId, customerId);
    }

}
