import { Module } from '@nestjs/common';
import { ContractorPhaseController } from './contractor-phase.controller';
import { ContractorPhaseService } from './contractor-phase.service';

@Module({
  controllers: [ContractorPhaseController],
  providers: [ContractorPhaseService]
})
export class ContractorPhaseModule {}
