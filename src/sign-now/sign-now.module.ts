import { Module } from '@nestjs/common';
import { SignNowService } from './sign-now.service';
import { SignNowController } from './sign-now.controller';

@Module({
  controllers: [SignNowController],
  providers: [SignNowService],
})
export class SignNowModule {}
