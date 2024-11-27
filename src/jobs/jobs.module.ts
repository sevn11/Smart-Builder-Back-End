import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { GoogleService } from 'src/core/services/google.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, GoogleService]
})
export class JobsModule {


  
}
