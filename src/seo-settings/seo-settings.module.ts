import { Module } from '@nestjs/common';
import { SeoSettingsController } from './seo-settings.controller';
import { SeoSettingsService } from './seo-settings.service';

@Module({
  controllers: [SeoSettingsController],
  providers: [SeoSettingsService]
})
export class SeoSettingsModule {}
