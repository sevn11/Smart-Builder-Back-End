import { Module } from '@nestjs/common';
import { GoogleCalendarController } from './google-calendar.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleService } from 'src/core/services/google.service';

@Module({
  controllers: [GoogleCalendarController],
  providers: [GoogleCalendarService, GoogleService]
})
export class GoogleCalendarModule {}
