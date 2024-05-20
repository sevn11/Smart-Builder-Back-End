import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { AdminTemplateQuestionsService } from '../services';
import { CreateQuestionDTO, UpdateQuestionDTO } from '../validators';

@Controller('admin/categories/:categoryId/templatequestions')
export class AdminTemplateQuestionsController {
    constructor(private templateQuestionService: AdminTemplateQuestionsService) {

    }

    @Post()
    createQuestion(@Param('categoryId', ParseIntPipe) categoryId, @Body() body: CreateQuestionDTO) {
        return this.templateQuestionService.createQuestion(categoryId, body);
    }
    @HttpCode(HttpStatus.OK)
    @Get()
    getQuestionList(@Param('categoryId', ParseIntPipe) categoryId) {
        return this.templateQuestionService.getQuestionList(categoryId);
    }
    @HttpCode(HttpStatus.OK)
    @Get(':questionId')
    getQuestionDetail(@Param('categoryId', ParseIntPipe) categoryId, @Param('questionId', ParseIntPipe) questionId) {
        return this.templateQuestionService.getQuestionDetail(categoryId, questionId);
    }
    @HttpCode(HttpStatus.OK)
    @Patch(':questionId')
    updateQuestion(@Param('categoryId', ParseIntPipe) categoryId, @Param('questionId', ParseIntPipe) questionId, @Body() body: UpdateQuestionDTO) {
        return this.templateQuestionService.updateQuestion(categoryId, questionId, body);
    }
}
