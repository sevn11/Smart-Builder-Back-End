import { Module } from '@nestjs/common';
import { CronJobsService } from './cron-jobs.service';
import { DatabaseService } from 'src/database/database.service';
import { SendgridService } from 'src/core/services';

@Module({
  providers: [CronJobsService, CronJobsService, DatabaseService, SendgridService]
})
export class CronJobsModule {}
