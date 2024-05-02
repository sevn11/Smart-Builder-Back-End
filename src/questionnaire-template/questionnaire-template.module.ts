import { Module } from '@nestjs/common';
import { QuestionnaireTemplateController } from './questionnaire-template.controller';
import { QuestionnaireTemplateService } from './questionnaire-template.service';

@Module({
  controllers: [QuestionnaireTemplateController],
  providers: [QuestionnaireTemplateService]
})
export class QuestionnaireTemplateModule {}
