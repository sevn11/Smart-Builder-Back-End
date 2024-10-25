import { Module } from '@nestjs/common';
import { SelectionTemplateController } from './selection-template.controller';
import { SelectionTemplateService } from './selection-template.service';
import { ImportTemplateService } from './import-template/import-template.service';

@Module({
    controllers: [SelectionTemplateController],
    providers: [SelectionTemplateService, ImportTemplateService]
})
export class SelectionTemplateModule { }
