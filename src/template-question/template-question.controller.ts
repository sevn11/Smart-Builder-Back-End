import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { TemplateQuestionService } from './template-question.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { CreateUpdateQuestionDTO } from './validators/create-update-question';
import { QuestionOrderDTO } from './validators/order';


@UseGuards(JwtGuard)
@Controller('companies/:companyId/template_question/:templateId/:categoryId')
export class TemplateQuestionController {
    constructor(private templateQuestionService: TemplateQuestionService) { }

    @Post()
    createQuestion(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Body() body: CreateUpdateQuestionDTO) {
        return this.templateQuestionService.createQuestion(user, companyId, templateId, categoryId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Get()
    getQuestionList(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number) {
        return this.templateQuestionService.getQuestionList(user, companyId, templateId, categoryId);
    }

    @HttpCode(HttpStatus.OK)
    @Get(':questionId')
    getQuestionDetail(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Param('questionId', ParseIntPipe) questionId: number) {
        return this.templateQuestionService.getQuestionDetail(user, companyId, templateId, categoryId, questionId);
    }

    @HttpCode(HttpStatus.OK)
    @Patch(':questionId')
    updateQuestion(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Param('questionId', ParseIntPipe) questionId: number, @Body() body: CreateUpdateQuestionDTO) {
        return this.templateQuestionService.updateQuestion(user, companyId, templateId, categoryId, questionId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Delete(':questionId')
    deleteQuestion(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Param('questionId', ParseIntPipe) questionId: number) {
        return this.templateQuestionService.deleteQuestion(user, companyId, templateId, categoryId, questionId);
    }
    // Update the questionorder within a category.
    @HttpCode(HttpStatus.OK)
    @Patch(':questionId/order')
    updateOrder(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Param('questionId', ParseIntPipe) questionId: number,
        @Body() body: QuestionOrderDTO
    ) {
        return this.templateQuestionService.updateOrder(user, companyId, templateId, categoryId, questionId, body);
    }
}
