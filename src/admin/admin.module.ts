import { Module } from '@nestjs/common';
import { 
  AdminQuestionnaireTemplateService, AdminCategoryService, AdminSelectionCategoryService, AdminSelectionService, 
  AdminTemplateQuestionsService, AdminUsersService } from './services';
import { 
  AdminQuestionnaireTemplateController, AdminCategoriesController, AdminSelectionCategoriesController, AdminSelectionController, 
  AdminTemplateQuestionsController, AdminUsersController } from './controllers';


@Module({
  providers: [AdminQuestionnaireTemplateService, AdminCategoryService, AdminTemplateQuestionsService, AdminUsersService, AdminSelectionService, AdminSelectionCategoryService],
  controllers: [AdminQuestionnaireTemplateController, AdminCategoriesController, AdminTemplateQuestionsController, AdminUsersController, AdminSelectionController, AdminSelectionCategoriesController]
})
export class AdminModule { }
