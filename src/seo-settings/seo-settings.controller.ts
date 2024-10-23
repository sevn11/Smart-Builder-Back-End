import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { GetUser } from 'src/core/decorators';
import { SeoSettingsService } from './seo-settings.service';
import { User } from '@prisma/client';

@Controller('seo-settings')
export class SeoSettingsController {

    constructor(private seoSettingsService: SeoSettingsService) {}

    @Get('/builder-plan-info')
    @HttpCode(HttpStatus.OK)
    getBuilerPlanInfo(@GetUser() user: User) {
        return this.seoSettingsService.getBuilerPlanInfo(user);
    }
}
