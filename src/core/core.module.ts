import { Module } from '@nestjs/common';
import { CoreController } from './core.controller';
import { CoreService } from './core.service';
import { SendgridService } from './services';

@Module({
  controllers: [CoreController],
  providers: [CoreService, SendgridService],
  exports: [SendgridService]
})
export class CoreModule { }
