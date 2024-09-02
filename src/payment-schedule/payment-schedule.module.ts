import { Module } from '@nestjs/common';
import { PaymentScheduleController } from './payment-schedule.controller';
import { PaymentScheduleService } from './payment-schedule.service';

@Module({
  controllers: [PaymentScheduleController],
  providers: [PaymentScheduleService]
})
export class PaymentScheduleModule {}
