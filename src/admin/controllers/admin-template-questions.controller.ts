import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { CreateUpdateQuestionDTO } from '../validators/questionnaire/create-update-question';
import { QuestionOrderDTO } from '../validators/questionnaire/order';
import { AdminTemplateQuestionService } from '../services';


@UseGuards(JwtGuard)
@Controller('admin/master-template-question/:templateId/:categoryId')
export class AdminTemplateQuestionController {
    constructor(private templateQuestionService: AdminTemplateQuestionService) { }

    @Post()
    createQuestion(@GetUser() user: User, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Body() body: CreateUpdateQuestionDTO) {
        return this.templateQuestionService.createQuestion(user, templateId, categoryId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Get()
    getQuestionList(@GetUser() user: User, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number) {
        return this.templateQuestionService.getQuestionList(user, templateId, categoryId);
    }

    @HttpCode(HttpStatus.OK)
    @Get(':questionId')
    getQuestionDetail(@GetUser() user: User, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Param('questionId', ParseIntPipe) questionId: number) {
        return this.templateQuestionService.getQuestionDetail(user, templateId, categoryId, questionId);
    }

    @HttpCode(HttpStatus.OK)
    @Patch(':questionId')
    updateQuestion(@GetUser() user: User, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Param('questionId', ParseIntPipe) questionId: number, @Body() body: CreateUpdateQuestionDTO) {
        return this.templateQuestionService.updateQuestion(user, templateId, categoryId, questionId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Delete(':questionId')
    deleteQuestion(@GetUser() user: User, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Param('questionId', ParseIntPipe) questionId: number) {
        return this.templateQuestionService.deleteQuestion(user, templateId, categoryId, questionId);
    }
    // Update the questionorder within a category.
    @HttpCode(HttpStatus.OK)
    @Patch(':questionId/order')
    updateOrder(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Param('questionId', ParseIntPipe) questionId: number,
        @Body() body: QuestionOrderDTO
    ) {
        return this.templateQuestionService.updateOrder(user, templateId, categoryId, questionId, body);
    }
}
