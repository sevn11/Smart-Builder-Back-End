import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { StripeService } from 'src/core/services/stripe.service';

@Module({
  providers: [UserService, StripeService],
  controllers: [UserController]
})
export class UserModule {}
