import { Module } from '@nestjs/common';
import { JobProjectEstimatorController } from './job-project-estimator.controller';
import { JobProjectEstimatorService } from './job-project-estimator.service';

@Module({
  controllers: [JobProjectEstimatorController],
  providers: [JobProjectEstimatorService]
})
export class JobProjectEstimatorModule {}
