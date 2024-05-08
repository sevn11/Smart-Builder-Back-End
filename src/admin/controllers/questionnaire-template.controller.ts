import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { AdminQuestionnaireTemplateService } from '../services';
import { CreateQuestionnaireTemplateDTO, UpdateQuestionnaireTemplateDTO } from '../validators';


@UseGuards(JwtGuard)
@Controller('admin/questionnairetemplate')
export class AdminQuestionnaireTemplateController {

    constructor(private adminQuestionnaireTemplateService: AdminQuestionnaireTemplateService) {

    }

    @Post()
    createQuestionnaireTemplate(@Body() body: CreateQuestionnaireTemplateDTO) {
        return this.adminQuestionnaireTemplateService.createQuestionnaireTemplate(body);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    getQuestionnaireTemplateList() {
        return this.adminQuestionnaireTemplateService.getQuestionnaireTemplateList()
    }

    @Get(':templateId')
    @HttpCode(HttpStatus.OK)
    getQuestionnaireTemplateDetails(@Param('templateId', ParseIntPipe) templateId: number) {
        return this.adminQuestionnaireTemplateService.getQuestionnaireTemplate(templateId)
    }

    @Patch(':templateId')
    @HttpCode(HttpStatus.OK)
    updateQuestionnaireTemplate(@Param('templateId', ParseIntPipe) templateId: number, @Body() body: UpdateQuestionnaireTemplateDTO) {
        return this.adminQuestionnaireTemplateService.updateQuestionnaireTemplate(templateId, body)
    }

    @Delete(':templateId')
    @HttpCode(HttpStatus.OK)
    deleteQuestionnaireTemplate(@Param('templateId', ParseIntPipe) templateId: number) {
        return this.adminQuestionnaireTemplateService.deleteQuestionnaireTemplate(templateId)
    }

}
