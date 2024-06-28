import { Module } from '@nestjs/common';
import { JobContractorController } from './job-contractor.controller';
import { JobContractorService } from './job-contractor.service';
import { SendgridService } from 'src/core/services';

@Module({
  controllers: [JobContractorController],
  providers: [JobContractorService, SendgridService]
})
export class JobContractorModule {}
