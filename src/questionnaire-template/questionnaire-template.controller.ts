import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { QuestionnaireTemplateService } from './questionnaire-template.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { CreateUpdateQuestionnaireTemplateDTO } from './validators/create-edit-questionnaire-template';
import { JwtGuard } from 'src/core/guards';

@UseGuards(JwtGuard)
@Controller('companies/:companyId/questionnaire-template')
export class QuestionnaireTemplateController {
    constructor(private questionnaireTemplateService: QuestionnaireTemplateService) {}

    @Post()
    createQuestionnaireTemplate(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Body() body: CreateUpdateQuestionnaireTemplateDTO) {
        return this.questionnaireTemplateService.createQuestionnaireTemplate(user, companyId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Get()
    getQuestionnaireTemplateList(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number) {
        return this.questionnaireTemplateService.getQuestionnaireTemplateList(user, companyId);
    }

    @HttpCode(HttpStatus.OK)
    @Patch(':templateId')
    updateJob(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: CreateUpdateQuestionnaireTemplateDTO,
    ) {
        return this.questionnaireTemplateService.updateQuestionnaireTemplate(user, companyId, templateId, body);
    }
}
