import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { CompanyService } from './company.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { AddUserDTO, UploadLogoDTO, UpdateCompanyDTO, UpdateUserDTO, ChangeEmailDTO } from './validators';


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

}
