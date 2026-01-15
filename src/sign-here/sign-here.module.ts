import { Module } from '@nestjs/common';
import { SignHereController } from './sign-here.controller';
import { SignHereService } from './sign-here.service';
import {  AWSService, SendgridService } from 'src/core/services';

@Module({
  controllers: [SignHereController],
  providers: [SignHereService, AWSService, SendgridService],
})
export class SignHereModule { }
