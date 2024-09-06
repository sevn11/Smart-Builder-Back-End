import { Module } from '@nestjs/common';
import { TemplateQuestionAnswerController } from './template-question-answer.controller';
import { TemplateQuestionAnswerService } from './template-question-answer.service';

@Module({
  controllers: [TemplateQuestionAnswerController],
  providers: [TemplateQuestionAnswerService]
})
export class TemplateQuestionAnswerModule { }