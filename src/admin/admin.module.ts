import { Module } from '@nestjs/common';
import { AdminQuestionnaireTemplateService, AdminCategoriesService } from './services';
import { AdminQuestionnaireTemplateController, AdminCategoriesController } from './controllers';

@Module({
  providers: [AdminQuestionnaireTemplateService, AdminCategoriesService],
  controllers: [AdminQuestionnaireTemplateController, AdminCategoriesController]
})
export class AdminModule { }
