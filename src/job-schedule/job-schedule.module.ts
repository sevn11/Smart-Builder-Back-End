import { Module } from '@nestjs/common';
import { JobScheduleController } from './job-schedule.controller';
import { JobScheduleService } from './job-schedule.service';
import { GoogleService } from 'src/core/services/google.service';

@Module({
  controllers: [JobScheduleController],
  providers: [JobScheduleService, GoogleService]
})
export class JobScheduleModule {}
