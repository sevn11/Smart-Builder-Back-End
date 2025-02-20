import { Module } from '@nestjs/common';
import { 
  AdminQuestionnaireTemplateService, AdminQuestionnaireCategoryService, AdminSelectionCategoryService, AdminSelectionTemplateService, 
  AdminTemplateQuestionService, AdminUsersService, AdminEmployeeService } from './services';
import { 
  AdminQuestionnaireTemplateController, AdminQuestionnaireCategoryController, AdminSelectionCategoriesController, AdminSelectionTemplateController, 
  AdminTemplateQuestionController, AdminUsersController, AdminEmployeesController } from './controllers';
import { StripeService } from 'src/core/services/stripe.service';
import { SendgridService } from 'src/core/services';
import { AdminProjectEstimatorTemplateService } from './services/admin-project-estimator-template.service';
import { ProjectEstimatorTemplateController } from './controllers/admin-project-estimator-template.controller';
import { ImportEstimatorTemplateService } from './services/import-template/import-estimator-template.service';
import { MasterQuestionnaireImportService } from './services/import-template/questionnaire-import.service';
import { ImportSelectionTemplateService } from './services/import-template/import-selection-template.service';


@Module({
  providers: [
    AdminQuestionnaireTemplateService, 
    AdminQuestionnaireCategoryService, 
    AdminTemplateQuestionService, 
    AdminUsersService, 
    AdminSelectionTemplateService, 
    AdminSelectionCategoryService, 
    ImportSelectionTemplateService,
    AdminEmployeeService, 
    StripeService, 
    SendgridService,
    AdminProjectEstimatorTemplateService,
    ImportEstimatorTemplateService,
    MasterQuestionnaireImportService,
  ],
  controllers: [
    AdminQuestionnaireTemplateController, 
    AdminQuestionnaireCategoryController, 
    AdminTemplateQuestionController, 
    AdminUsersController, 
    AdminSelectionTemplateController, 
    AdminSelectionCategoriesController, 
    AdminEmployeesController,
    ProjectEstimatorTemplateController
  ]
})
export class AdminModule { }
