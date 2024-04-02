import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CoreModule } from 'src/core/core.module';
import { SendgridService } from 'src/core/services';

@Module({
  imports: [CoreModule],
  controllers: [CompanyController],
  providers: [CompanyService, SendgridService]
})
export class CompanyModule { }
