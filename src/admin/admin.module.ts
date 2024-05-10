import { Module } from '@nestjs/common';
import { AdminQuestionnaireTemplateService, AdminCategoriesService, AdminTemplateQuestionsService, AdminUsersService } from './services';
import { AdminQuestionnaireTemplateController, AdminCategoriesController, AdminTemplateQuestionsController, AdminUsersController } from './controllers';

@Module({
  providers: [AdminQuestionnaireTemplateService, AdminCategoriesService, AdminTemplateQuestionsService, AdminUsersService],
  controllers: [AdminQuestionnaireTemplateController, AdminCategoriesController, AdminTemplateQuestionsController, AdminUsersController]
})
export class AdminModule { }
