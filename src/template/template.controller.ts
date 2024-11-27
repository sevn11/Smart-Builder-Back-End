import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { TemplateService } from './template.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { TypeValidationPipe } from './type-validation/type-validation.pipe';
import { QuestionAnswerDTO } from './validators/answer';

@UseGuards(JwtGuard)
@Controller('companies/:companyId/template')
export class TemplateController {

    constructor(private templateService: TemplateService) { }

    @HttpCode(HttpStatus.OK)
    @Get()
    getTemplate(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number) {
        return this.templateService.getTemplate(user, companyId);
    }

    @HttpCode(HttpStatus.OK)
    @Get('/:type/job/:jobId')
    getTemplateData(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('type', TypeValidationPipe) type: string, @Param('jobId', ParseIntPipe) jobId: number) {
        return this.templateService.getTemplateData(user, companyId, type, jobId);
    }

    @HttpCode(HttpStatus.OK)
    @Post('/:type/:templateId/:questionId/:categoryId')
    updateAnswer(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('questionId', ParseIntPipe) questionId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Body() body: QuestionAnswerDTO,
        @Param('type', TypeValidationPipe) type: string
    ) {
        return this.templateService.createAnswer(user, companyId, templateId, questionId, categoryId, body, type);
    }
}