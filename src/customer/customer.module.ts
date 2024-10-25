import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { GoogleService } from 'src/core/services/google.service';

@Module({
  providers: [CustomerService, GoogleService],
  controllers: [CustomerController]
})
export class CustomerModule {}
