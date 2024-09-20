import { Module } from '@nestjs/common';
import { TemplateQuestionController } from './template-question.controller';
import { TemplateQuestionService } from './template-question.service';

@Module({
  controllers: [TemplateQuestionController],
  providers: [TemplateQuestionService]
})
export class TemplateQuestionModule { }