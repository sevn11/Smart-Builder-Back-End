import { Module } from '@nestjs/common';
import { CoreController } from './core.controller';
import { CoreService } from './core.service';
import { SendgridService, AWSService } from './services';

@Module({
  controllers: [CoreController],
  providers: [CoreService, SendgridService, AWSService],
  exports: [SendgridService, AWSService]
})
export class CoreModule { }
