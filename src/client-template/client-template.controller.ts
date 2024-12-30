import { Body, Controller, Delete, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { ClientTemplateService } from './client-template.service';
import { GetUser } from 'src/core/decorators';
import { ClientCategory, User } from '@prisma/client';
import { TypeValidationPipe } from './type-validation/type-validation.pipe';
import { ClientCategoryDTO } from './validators/client-category';
import { ClientQuestionDTO } from './validators/client-question';
import { TemplateTypeValue } from 'src/core/utils';

@UseGuards(JwtGuard)
@Controller('company/:companyId/job/:jobId/client-template')
export class ClientTemplateController {
    constructor(private clientTemplateService: ClientTemplateService) { }

    @HttpCode(HttpStatus.OK)
    @Post('/:type/:templateId/category')
    addCategory(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Param('type', TypeValidationPipe) type: TemplateTypeValue,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: ClientCategoryDTO
    ) {
        return this.clientTemplateService.addCategory(user, companyId, jobId, type, templateId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Patch('/:type/:templateId/category/:categoryId')
    updateCategory(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Param('type', TypeValidationPipe) type: TemplateTypeValue,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Body() body: ClientCategoryDTO
    ) {
        return this.clientTemplateService.updateCategory(user, companyId, jobId, type, templateId, categoryId, body);
    }

    // TODO: Add the orders
    @HttpCode(HttpStatus.OK)
    @Delete('/:type/:templateId/category/:categoryId')
    deleteCategory(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('type') type: TemplateTypeValue,
        @Param('categoryId', ParseIntPipe) categoryId: number,
    ) {
        return this.clientTemplateService.deleteCategory(user, type, companyId, jobId, templateId, categoryId);
    }

    @HttpCode(HttpStatus.OK)
    @Post('/:type/:templateId/category/:categoryId/question')
    createQuestion(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('type', TypeValidationPipe) type: TemplateTypeValue,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Body() body: ClientQuestionDTO
    ) {
        return this.clientTemplateService.createQuestion(user, type, companyId, jobId, templateId, categoryId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Patch('/:type/:templateId/category/:categoryId/question/:questionId')
    editQuestion(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Param('type', TypeValidationPipe) type: TemplateTypeValue,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Param('questionId', ParseIntPipe) questionId: number,
        @Body() body: ClientQuestionDTO
    ) {
        return this.clientTemplateService.editQuestion(user, type, companyId, jobId, templateId, categoryId, questionId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Delete('/:type/:templateId/category/:categoryId/question/:questionId')
    deleteQuestion(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Param('type', TypeValidationPipe) type: TemplateTypeValue,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Param('questionId', ParseIntPipe) questionId: number,
    ) {
        return this.clientTemplateService.deleteQuestion(user, type, companyId, jobId, templateId, categoryId, questionId);
    }
}