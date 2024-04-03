import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { CompanyService } from './company.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { AddUserDTO, UploadLogoDTO } from './validators';


@UseGuards(JwtGuard)
@Controller('companies')
export class CompanyController {

    constructor(private companyService: CompanyService) {

    }

    @Post(':id/users')
    addUsers(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number, @Body() body: AddUserDTO) {
        return this.companyService.addUsers(user, companyId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Post(':id/uploadLogo')
    getUploadLogoSignedUrl(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number, @Body() body: UploadLogoDTO) {
        return this.companyService.getUploadLogoSignedUrl(user, companyId, body);
    }

}
