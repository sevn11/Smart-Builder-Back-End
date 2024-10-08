import { Module } from '@nestjs/common';
import { SelectionTemplateController } from './selection-template.controller';
import { SelectionTemplateService } from './selection-template.service';

@Module({
    controllers: [SelectionTemplateController],
    providers: [SelectionTemplateService]
})
export class SelectionTemplateModule { }
