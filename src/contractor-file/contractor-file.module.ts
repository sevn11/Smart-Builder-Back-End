import { Module } from '@nestjs/common';
import { ContractorFileController } from './contractor-file.controller';
import { ContractorFileService } from './contractor-file.service';

@Module({
  controllers: [ContractorFileController],
  providers: [ContractorFileService]
})
export class ContractorFileModule {}
