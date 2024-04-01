import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { CompanyService } from './company.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { AddUserDTO } from './validators';


@UseGuards(JwtGuard)
@Controller('companies')
export class CompanyController {

    constructor(private companyService: CompanyService) {

    }

    @Post(':id/users')
    addUsers(@GetUser() user: User, @Param('id', ParseIntPipe) companyId: number, @Body() body: AddUserDTO) {
        return this.companyService.addUsers(user, companyId, body);
    }

}
