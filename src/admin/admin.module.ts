import { Module } from '@nestjs/common';
import { AdminQuestionnaireTemplateService, AdminCategoriesService, AdminTemplateQuestionsService } from './services';
import { AdminQuestionnaireTemplateController, AdminCategoriesController, AdminTemplateQuestionsController } from './controllers';

@Module({
  providers: [AdminQuestionnaireTemplateService, AdminCategoriesService, AdminTemplateQuestionsService],
  controllers: [AdminQuestionnaireTemplateController, AdminCategoriesController, AdminTemplateQuestionsController]
})
export class AdminModule { }
