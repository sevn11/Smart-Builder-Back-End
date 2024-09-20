import { Body, Controller, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { TemplateQuestionAnswerService } from './template-question-answer.service';
import { GetUser } from 'src/core/decorators';
import { CreateUpdateAnswerDTO } from './validators/create-update-answer';
import { User } from '@prisma/client';


@UseGuards(JwtGuard)
@Controller('companies/:companyId/template-question-answer/:templateId/:categoryId')
export class TemplateQuestionAnswerController {
    constructor(private templateQuestionAnswerService: TemplateQuestionAnswerService) { }

    @Post()
    createJob(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Body() body: CreateUpdateAnswerDTO) {
        return this.templateQuestionAnswerService.addAnswer(user, companyId, templateId, categoryId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Patch(':questionId')
    updateQuestion(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Param('questionId', ParseIntPipe) questionId: number, @Body() body: CreateUpdateAnswerDTO) {
        return this.templateQuestionAnswerService.updateAnswer(user, companyId, templateId, categoryId, questionId, body);
    }
}