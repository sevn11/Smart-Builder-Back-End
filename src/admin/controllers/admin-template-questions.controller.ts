import { Controller } from '@nestjs/common';
import { AdminTemplateQuestionsService } from '../services';

@Controller('admin/template-questions')
export class AdminTemplateQuestionsController {
    constructor(private templateQuestionService: AdminTemplateQuestionsService) {

    }
}
