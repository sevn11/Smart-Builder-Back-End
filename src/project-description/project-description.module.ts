import { Module } from '@nestjs/common';
import { ProjectDescriptionController } from './project-description.controller';
import { ProjectDescriptionService } from './project-description.service';

@Module({
  controllers: [ProjectDescriptionController],
  providers: [ProjectDescriptionService]
})
export class ProjectDescriptionModule {}
