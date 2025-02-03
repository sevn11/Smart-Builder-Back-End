import { Module } from '@nestjs/common';
import { GanttController } from './gantt.controller';
import { GanttService } from './gantt.service';
import { GoogleService } from 'src/core/services/google.service';

@Module({
  controllers: [GanttController],
  providers: [GanttService, GoogleService]
})
export class GanttModule { }
