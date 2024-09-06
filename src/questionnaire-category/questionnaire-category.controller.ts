import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { QuestionnaireCategoryService } from './questionnaire-category.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { CreateUpdateCategoryDTO } from './validators/create-update-category';
import { UpdateCategoryOrderDTO } from './validators/update-questionnaire_order';


@UseGuards(JwtGuard)
@Controller('companies/:companyId/questionnairetemplate/:templateId/categories')
export class QuestionnaireCategoryController {
    constructor(private questionnaireCategoryService: QuestionnaireCategoryService) { }

    @Post()
    createJob(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Body() body: CreateUpdateCategoryDTO) {
        return this.questionnaireCategoryService.createCategory(user, companyId, templateId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Get()
    getCategoryList(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number) {
        return this.questionnaireCategoryService.getCategoryList(user, companyId, templateId);
    }

    @HttpCode(HttpStatus.OK)
    @Patch(':categoryId')
    updateCategory(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Body() body: CreateUpdateCategoryDTO) {
        return this.questionnaireCategoryService.updateCategory(user, companyId, templateId, categoryId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Delete(':categoryId')
    deleteCategory(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number) {
        return this.questionnaireCategoryService.deleteCategory(user, companyId, templateId, categoryId);
    }

    @HttpCode(HttpStatus.OK)
    @Patch(':categoryId/order')
    changeCategoryOrder(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Body() body: UpdateCategoryOrderDTO) {
        return this.questionnaireCategoryService.changeCategoryOrder(user, companyId, templateId, categoryId, body);
    }
}