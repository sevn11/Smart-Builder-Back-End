import { Module } from '@nestjs/common';
import { ClientTemplateController } from './client-template.controller';
import { ClientTemplateService } from './client-template.service';

@Module({
  controllers: [ClientTemplateController],
  providers: [ClientTemplateService]
})
export class ClientTemplateModule { }