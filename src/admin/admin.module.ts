import { Module } from '@nestjs/common';
import { 
  AdminQuestionnaireTemplateService, AdminCategoryService, AdminSelectionCategoryService, AdminSelectionService, 
  AdminTemplateQuestionsService, AdminUsersService, AdminEmployeeService } from './services';
import { 
  AdminQuestionnaireTemplateController, AdminCategoriesController, AdminSelectionCategoriesController, AdminSelectionController, 
  AdminTemplateQuestionsController, AdminUsersController, AdminEmployeesController } from './controllers';
import { StripeService } from 'src/core/services/stripe.service';
import { SendgridService } from 'src/core/services';


@Module({
  providers: [AdminQuestionnaireTemplateService, AdminCategoryService, AdminTemplateQuestionsService, AdminUsersService, AdminSelectionService, AdminSelectionCategoryService, AdminEmployeeService, StripeService, SendgridService],
  controllers: [AdminQuestionnaireTemplateController, AdminCategoriesController, AdminTemplateQuestionsController, AdminUsersController, AdminSelectionController, AdminSelectionCategoriesController, AdminEmployeesController]
})
export class AdminModule { }
