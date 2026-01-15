import { Module } from '@nestjs/common';
import { SignHereController } from './sign-here.controller';
import { SignHereService } from './sign-here.service';
import {  AWSService } from 'src/core/services';

@Module({
  controllers: [SignHereController],
  providers: [SignHereService, AWSService],
})
export class SignHereModule { }
