import { Module } from '@nestjs/common';
import { QuestionnaireCategoryController } from './questionnaire-category.controller';
import { QuestionnaireCategoryService } from './questionnaire-category.service';

@Module({
  controllers: [QuestionnaireCategoryController],
  providers: [QuestionnaireCategoryService]
})
export class QuestionnaireCategoryModule { }