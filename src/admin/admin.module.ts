import { Module } from '@nestjs/common';
import { AdminQuestionnaireTemplateService } from './services';
import { AdminQuestionnaireTemplateController } from './controllers';

@Module({
  providers: [AdminQuestionnaireTemplateService],
  controllers: [AdminQuestionnaireTemplateController]
})
export class AdminModule { }
