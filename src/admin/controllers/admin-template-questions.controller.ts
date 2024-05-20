import { Body, Controller, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from '@nestjs/common';
import { AdminTemplateQuestionsService } from '../services';
import { CreateQuestionDTO } from '../validators/create-question';

@Controller('admin/categories/:categoryId/templatequestions')
export class AdminTemplateQuestionsController {
    constructor(private templateQuestionService: AdminTemplateQuestionsService) {

    }

    @Post()
    createQuestion(@Param('categoryId', ParseIntPipe) categoryId,  @Body() body: CreateQuestionDTO) {
        return this.templateQuestionService.createQuestion(categoryId, body);

    }
}
