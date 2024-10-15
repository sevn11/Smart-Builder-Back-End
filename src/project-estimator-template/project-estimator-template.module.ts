import { Module } from '@nestjs/common';
import { ProjectEstimatorTemplateController } from './project-estimator-template.controller';
import { ProjectEstimatorTemplateService } from './project-estimator-template.service';
import { ImportTemplateService } from './import-template/import-template.service';

@Module({
    controllers: [ProjectEstimatorTemplateController],
    providers: [ProjectEstimatorTemplateService, ImportTemplateService]
})
export class ProjectEstimatorTemplateModule { }
