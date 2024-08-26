import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { TermsAndConditionService } from './terms-and-condition.service';

@Controller('terms-and-condition')
export class TermsAndConditionController {

    constructor(private termsAndConditionService: TermsAndConditionService) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    getTermsAndCondition() {
        return this.termsAndConditionService.getContent();
    }
}
