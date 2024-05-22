import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { AdminCategoryService } from '../services';
import { CreateCategoryDTO, UpdateCategoryDTO, UpdateCategoryOrderDTO } from '../validators';

@UseGuards(JwtGuard)
@Controller('admin/questionnairetemplate/:templateId/categories')
export class AdminCategoriesController {
    constructor(private adminCategoriesService: AdminCategoryService) {

    }
    @Post()
    createCategories(@Param('templateId', ParseIntPipe) templateId: number, @Body() body: CreateCategoryDTO) {
        return this.adminCategoriesService.createCategory(templateId, body);
    }
    @Get()
    getCategoryList(@Param('templateId', ParseIntPipe) templateId: number) {
        return this.adminCategoriesService.getCategoryList(templateId);
    }
    @Get(':categoryId')
    getCategoryDetails(@Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number) {
        return this.adminCategoriesService.getCategoryDetails(templateId, categoryId);
    }
    @Patch(':categoryId')
    updateCategory(@Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Body() body: UpdateCategoryDTO) {
        return this.adminCategoriesService.updateCategory(templateId, categoryId, body);
    }
    @Delete(':categoryId')
    deleteCategory(@Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number) {
        return this.adminCategoriesService.deleteCategory(templateId, categoryId);
    }
    @Patch(':categoryId/order')
    changeCategoryOrder(@Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Body() body: UpdateCategoryOrderDTO) {
        return this.adminCategoriesService.changeCategoryOrder(templateId, categoryId, body);
    }
}
