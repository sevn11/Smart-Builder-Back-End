import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { CreateUpdateCategoryDTO } from '../validators/questionnaire/create-update-category';
import { UpdateCategoryOrderDTO } from '../validators/questionnaire/update-questionnaire_order';
import { AdminQuestionnaireCategoryService } from '../services';


@UseGuards(JwtGuard)
@Controller('admin/master-questionnaire-category/:templateId/categories')
export class AdminQuestionnaireCategoryController {
    constructor(private adminQuestionnaireCategoryService: AdminQuestionnaireCategoryService) { }

    @Post()
    createCategory(@GetUser() user: User, @Param('templateId', ParseIntPipe) templateId: number, @Body() body: CreateUpdateCategoryDTO) {
        return this.adminQuestionnaireCategoryService.createCategory(user, templateId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Get()
    getCategoryList(@GetUser() user: User, @Param('templateId', ParseIntPipe) templateId: number) {
        return this.adminQuestionnaireCategoryService.getCategoryList(user, templateId);
    }

    @HttpCode(HttpStatus.OK)
    @Patch(':categoryId')
    updateCategory(@GetUser() user: User, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Body() body: CreateUpdateCategoryDTO) {
        return this.adminQuestionnaireCategoryService.updateCategory(user, templateId, categoryId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Delete(':categoryId')
    deleteCategory(@GetUser() user: User, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number) {
        return this.adminQuestionnaireCategoryService.deleteCategory(user, templateId, categoryId);
    }

    @HttpCode(HttpStatus.OK)
    @Patch(':categoryId/order')
    changeCategoryOrder(@GetUser() user: User, @Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Body() body: UpdateCategoryOrderDTO) {
        return this.adminQuestionnaireCategoryService.changeCategoryOrder(user, templateId, categoryId, body);
    }
}