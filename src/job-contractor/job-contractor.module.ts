import { Module } from '@nestjs/common';
import { JobContractorController } from './job-contractor.controller';
import { JobContractorService } from './job-contractor.service';

@Module({
  controllers: [JobContractorController],
  providers: [JobContractorService]
})
export class JobContractorModule {}
