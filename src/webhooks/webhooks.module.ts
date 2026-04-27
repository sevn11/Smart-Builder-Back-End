import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { StripeService } from 'src/core/services/stripe.service';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, StripeService],
})
export class WebhooksModule {}