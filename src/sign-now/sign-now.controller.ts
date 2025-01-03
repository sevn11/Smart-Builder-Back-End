import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, UseGuards, ParseIntPipe } from '@nestjs/common';
import { SignNowService } from './sign-now.service';
import { UploadDocumentDTO } from './validators/upload-document';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { JwtGuard } from 'src/core/guards';

@UseGuards(JwtGuard)
@Controller('companies/:companyId/jobs/:jobId/sign-now')
export class SignNowController {
  constructor(private readonly signNowService: SignNowService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  signDocument(
    @Param('companyId', ParseIntPipe) companyId: number, 
    @Param('jobId', ParseIntPipe) jobId: number,
    @UploadedFile() file: Express.Multer.File, 
    @Body() body: any,
    @GetUser() user: User
  ) {
    return this.signNowService.signDocument(companyId, jobId, file, body, user);
  }

}
