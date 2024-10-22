import { Module } from '@nestjs/common';
import { QuestionnaireTemplateController } from './questionnaire-template.controller';
import { QuestionnaireTemplateService } from './questionnaire-template.service';
import { QuestionnaireImportService } from './questionnaire-import/questionnaire-import.service'

@Module({
  controllers: [QuestionnaireTemplateController],
  providers: [QuestionnaireTemplateService, QuestionnaireImportService]
})
export class QuestionnaireTemplateModule { }
