import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { AdminTemplateQuestionsService } from '../services';
import { CreateQuestionDTO, UpdateQuestionDTO } from '../validators';

@Controller('admin/categories/:categoryId/templatequestions')
export class AdminTemplateQuestionsController {
    constructor(private templateQuestionService: AdminTemplateQuestionsService) {

    }

    @Post()
    createQuestion(@Param('categoryId', ParseIntPipe) categoryId: number, @Body() body: CreateQuestionDTO) {
        return this.templateQuestionService.createQuestion(categoryId, body);
    }
    @HttpCode(HttpStatus.OK)
    @Get()
    getQuestionList(@Param('categoryId', ParseIntPipe) categoryId: number) {
        return this.templateQuestionService.getQuestionList(categoryId);
    }
    @HttpCode(HttpStatus.OK)
    @Get(':questionId')
    getQuestionDetail(@Param('categoryId', ParseIntPipe) categoryId: number, @Param('questionId', ParseIntPipe) questionId: number) {
        return this.templateQuestionService.getQuestionDetail(categoryId, questionId);
    }
    @HttpCode(HttpStatus.OK)
    @Patch(':questionId')
    updateQuestion(@Param('categoryId', ParseIntPipe) categoryId: number, @Param('questionId', ParseIntPipe) questionId: number, @Body() body: UpdateQuestionDTO) {
        return this.templateQuestionService.updateQuestion(categoryId, questionId, body);
    }
    @HttpCode(HttpStatus.OK)
    @Delete(':questionId')
    deleteQuestion(@Param('categoryId', ParseIntPipe) categoryId: number, @Param('questionId', ParseIntPipe) questionId: number) {
        return this.templateQuestionService.deleteQuestion(categoryId, questionId);
    }
}
