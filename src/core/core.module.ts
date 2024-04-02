import { Module } from '@nestjs/common';
import { CoreController } from './core.controller';
import { CoreService } from './core.service';
import { SendgridService } from './services';
import { SendgridClient } from './classes';

@Module({
  controllers: [CoreController],
  providers: [CoreService, SendgridService, SendgridClient],
  exports: [SendgridService]
})
export class CoreModule { }
