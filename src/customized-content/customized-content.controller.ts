import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { CustomizedContentService } from './customized-content.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { CustomizedContentDTO } from './validators/customized-content';

@UseGuards(JwtGuard)
@Controller('companies/:companyId/customized-content')
export class CustomizedContentController {

    constructor(private customizedContentService: CustomizedContentService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    getCustomContents(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number) {
        return this.customizedContentService.getCustomContents(user, companyId);
    }

    @Get('/:pageType')
    @HttpCode(HttpStatus.OK)
    getSpecificContent(
        @GetUser() user: User, 
        @Param('companyId', ParseIntPipe) companyId: number,  
        @Param('pageType') pageType: string
    ) {
        return this.customizedContentService.getSpecificContent(user, companyId, pageType);
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    saveCustomContents(
        @GetUser() user: User, 
        @Param('companyId', ParseIntPipe) companyId: number,
        @Body() body: CustomizedContentDTO
    ) {
        return this.customizedContentService.saveCustomContents(user, companyId, body);
    }
}
