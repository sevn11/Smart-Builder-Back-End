import { Module } from '@nestjs/common';
import { TermsAndConditionController } from './terms-and-condition.controller';
import { TermsAndConditionService } from './terms-and-condition.service';

@Module({
    controllers: [TermsAndConditionController],
    providers: [TermsAndConditionService]
})
export class TermsAndConditionModule { }
