import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { StripeService } from 'src/core/services/stripe.service';
import { SignNowService } from 'src/sign-now/sign-now.service';

@Module({
  providers: [WebhooksService, StripeService, SignNowService],
  controllers: [WebhooksController]
})
export class WebhooksModule {}
