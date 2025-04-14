import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { CompanyService } from './company.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { AddUserDTO, UploadLogoDTO, UpdateCompanyDTO, UpdateUserDTO, ChangeEmailDTO } from './validators';
import { PaymentMethodDTO } from './validators/payment-method';


@UseGuards(JwtGuard)
@Controller('companies')
export class CompanyController {

    constructor(private companyService: CompanyService) {

    }

    @Post(':id/users')
    addUsers(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number, @Body() body: AddUserDTO) {
        return this.companyService.addUsers(user, companyId, body);
    }

    @Delete(':id/users/:userId')
    removeUser(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number, @Param('userId', ParseIntPipe) userId: number) {
        return this.companyService.removeUser(user, companyId, userId)
    }

    @Patch(':id/users/:userId')
    updateUser(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number, @Param('userId', ParseIntPipe) userId: number, @Body() body: UpdateUserDTO) {
        return this.companyService.updateUser(user, companyId, userId, body)
    }

    @Patch(':id/users/:userId/email')
    changeUserEmail(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number, @Param('userId', ParseIntPipe) userId: number, @Body() body: ChangeEmailDTO) {
        return this.companyService.changeUserEmail(user, companyId, userId, body)
    }

    @HttpCode(HttpStatus.OK)
    @Get(':id/')
    getCompanyDetails(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number) {
        return this.companyService.getCompanyDetails(user, companyId);
    }

    @HttpCode(HttpStatus.OK)
    @Get(':id/users')
    getUserList(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number) {
        return this.companyService.getUserList(user, companyId);
    }


    @HttpCode(HttpStatus.OK)
    @Post(':id/uploadLogo')
    getUploadLogoSignedUrl(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number, @Body() body: UploadLogoDTO) {
        return this.companyService.getUploadLogoSignedUrl(user, companyId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Patch(':id')
    updateCompany(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number, @Body() body: UpdateCompanyDTO) {
        return this.companyService.updateCompany(user, companyId, body);

    }

    @HttpCode(HttpStatus.OK)
    @Get(':id/payment-method')
    getDefaultPaymentMethod(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number) {
        return this.companyService.getDefaultPaymentMethod(user, companyId);
    }

    @HttpCode(HttpStatus.OK)
    @Post(':id/payment-method')
    setDefaultPaymentMethod(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number, @Body() body: PaymentMethodDTO) {
        return this.companyService.setDefaultPaymentMethod(user, body);
    }

    @HttpCode(HttpStatus.OK)
    @Get(':id/transactions')
    getTransactions(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number) {
        return this.companyService.getTransactions(user, companyId);
    }

    @HttpCode(HttpStatus.OK)
    @Post(':id/retry-payment/:paymenLogId')
    retryPayment(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number, @Param('paymenLogId', ParseIntPipe) paymenLogId: number, @Body() body: PaymentMethodDTO) {
        return this.companyService.retryPayment(user, paymenLogId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Post(':id/renew-subscription/:employeeId')
    renewEmployeeSubscription(
        @GetUser() user: User, 
        @Param('id', ParseIntPipe) companyId: number, 
        @Param('employeeId', ParseIntPipe) employeeId: number, 
        @Body() body: PaymentMethodDTO
    ) {
        return this.companyService.renewEmployeeSubscription(user, employeeId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Get(':id/subscription-info')
    getBuilderSubscriptionInfo(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number) {
        return this.companyService.getBuilderSubscriptionInfo(user);
    }

    @HttpCode(HttpStatus.OK)
    @Get(':id/cancel-subscription')
    cancelBuilderSubscription(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number) {
        return this.companyService.cancelBuilderSubscription(user);
    }

    @HttpCode(HttpStatus.OK)
    @Get(':id/sign-now-plan-info')
    getSignNowPlanInfo(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number) {
        return this.companyService.getSignNowPlanInfo(user, companyId);
    }

    @Patch(':id/sales-tax-rate')
    updateCompanySalesTaxRate(
        @GetUser() user: User, 
        @Param('id', ParseIntPipe) companyId: number,
        @Body() body: { salesTaxRate: number })
    {
        return this.companyService.updateCompanySalesTaxRate(user, companyId, body)
    }
}
