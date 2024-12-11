import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CoreModule } from 'src/core/core.module';
import { SendgridService, AWSService } from 'src/core/services';
import { StripeService } from 'src/core/services/stripe.service';

@Module({
  imports: [CoreModule],
  controllers: [CompanyController],
  providers: [CompanyService, SendgridService, AWSService, StripeService]
})

export class CompanyModule { }
