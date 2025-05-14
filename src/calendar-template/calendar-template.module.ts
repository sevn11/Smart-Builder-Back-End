import { Module } from '@nestjs/common';
import { CalendarTemplateService } from './calendar-template.service';
import { CalendarTemplateController } from './calendar-template.controller';
import { GoogleService } from 'src/core/services/google.service';
import { CalendarTemplateLinkService } from './calendar-template-link.service';

@Module({
  controllers: [CalendarTemplateController],
  providers: [
    CalendarTemplateService,
    GoogleService,
    CalendarTemplateLinkService
  ],
})
export class CalendarTemplateModule { }
