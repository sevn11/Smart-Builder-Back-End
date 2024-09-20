import { Module } from '@nestjs/common';
import { ProjectEstimatorTemplateController } from './project-estimator-template.controller';
import { ProjectEstimatorTemplateService } from './project-estimator-template.service';

@Module({
    controllers: [ProjectEstimatorTemplateController],
    providers: [ProjectEstimatorTemplateService]
})
export class ProjectEstimatorTemplateModule { }
