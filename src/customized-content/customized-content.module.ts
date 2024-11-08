import { Module } from '@nestjs/common';
import { CustomizedContentController } from './customized-content.controller';
import { CustomizedContentService } from './customized-content.service';

@Module({
  controllers: [CustomizedContentController],
  providers: [CustomizedContentService]
})
export class CustomizedContentModule {}
