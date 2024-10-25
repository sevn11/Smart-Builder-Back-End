import { Module } from '@nestjs/common';
import { 
  AdminQuestionnaireTemplateService, AdminCategoryService, AdminSelectionCategoryService, AdminSelectionService, 
  AdminTemplateQuestionsService, AdminUsersService, AdminEmployeeService } from './services';
import { 
  AdminQuestionnaireTemplateController, AdminCategoriesController, AdminSelectionCategoriesController, AdminSelectionController, 
  AdminTemplateQuestionsController, AdminUsersController, AdminEmployeesController } from './controllers';


@Module({
  providers: [AdminQuestionnaireTemplateService, AdminCategoryService, AdminTemplateQuestionsService, AdminUsersService, AdminSelectionService, AdminSelectionCategoryService, AdminEmployeeService],
  controllers: [AdminQuestionnaireTemplateController, AdminCategoriesController, AdminTemplateQuestionsController, AdminUsersController, AdminSelectionController, AdminSelectionCategoriesController, AdminEmployeesController]
})
export class AdminModule { }
