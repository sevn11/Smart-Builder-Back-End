import { Module } from '@nestjs/common';
import { DevopsService } from './devops.service';
import { DevopsController } from './devops.controller';

@Module({
  providers: [DevopsService],
  controllers: [DevopsController]
})
export class DevopsModule {}
