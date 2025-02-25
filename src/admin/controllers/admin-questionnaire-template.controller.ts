import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { CreateUpdateQuestionnaireTemplateDTO } from '../validators/questionnaire/create-edit-questionnaire-template';
import { JwtGuard } from 'src/core/guards';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminQuestionnaireTemplateService } from '../services';


@UseGuards(JwtGuard)
@Controller('admin/master-questionnaire-template')
export class AdminQuestionnaireTemplateController {
  constructor(private adminQuestionnaireTemplateService: AdminQuestionnaireTemplateService) { }

  @Post()
  createQuestionnaireTemplate(@GetUser() user: User, @Body() body: CreateUpdateQuestionnaireTemplateDTO) {
    return this.adminQuestionnaireTemplateService.createQuestionnaireTemplate(user, body);
  }

  @HttpCode(HttpStatus.OK)
  @Get()
  getQuestionnaireTemplateList(@GetUser() user: User) {
    return this.adminQuestionnaireTemplateService.getQuestionnaireTemplateList(user);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':templateId')
  updateQuestionnaireTemplate(
    @GetUser() user: User,
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() body: CreateUpdateQuestionnaireTemplateDTO,
  ) {
    return this.adminQuestionnaireTemplateService.updateQuestionnaireTemplate(user, templateId, body);
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':templateId')
  deleteQuestionnaireTemplate(
    @GetUser() user: User,
    @Param('templateId', ParseIntPipe) templateId: number
  ) {
    return this.adminQuestionnaireTemplateService.deleteQuestionnaireTemplate(user, templateId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('import-template')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 30 * 1024 * 1024 }, // Limit file size to 10MB
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'text/csv') {
          return cb(new BadRequestException('Only CSV files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  importTemplate(
    @GetUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { templateId: string },
  ) {
    return this.adminQuestionnaireTemplateService.importTemplate(user, file, body);
  }
}
