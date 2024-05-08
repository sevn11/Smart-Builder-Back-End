import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { AdminService } from './admin.service';
import { CreateQuestionnaireTemplateDTO, UpdateQuestionnaireTemplateDTO } from './validators';


@UseGuards(JwtGuard)
@Controller('admin')
export class AdminController {

    constructor(private adminService: AdminService) {

    }

    @Post('questionnairetemplate')
    createQuestionnaireTemplate(@Body() body: CreateQuestionnaireTemplateDTO) {
        return this.adminService.createQuestionnaireTemplate(body);
    }

    @Get('questionnairetemplate')
    @HttpCode(HttpStatus.OK)
    getQuestionnaireTemplateList() {
        return this.adminService.getQuestionnaireTemplateList()
    }

    @Get('questionnairetemplate/:templateId')
    @HttpCode(HttpStatus.OK)
    getQuestionnaireTemplateDetails(@Param('templateId', ParseIntPipe) templateId: number) {
        return this.adminService.getQuestionnaireTemplate(templateId)
    }

    @Patch('questionnairetemplate/:templateId')
    @HttpCode(HttpStatus.OK)
    updateQuestionnaireTemplate(@Param('templateId', ParseIntPipe) templateId: number, @Body() body: UpdateQuestionnaireTemplateDTO) {
        return this.adminService.updateQuestionnaireTemplate(templateId, body)
    }

    @Delete('questionnairetemplate/:templateId')
    @HttpCode(HttpStatus.OK)
    deleteQuestionnaireTemplate(@Param('templateId', ParseIntPipe) templateId: number) {
        return this.adminService.deleteQuestionnaireTemplate(templateId)
    }

}
