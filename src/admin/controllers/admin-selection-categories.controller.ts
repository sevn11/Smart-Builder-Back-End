import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { AdminSelectionCategoryService } from '../services';
import { CreateSelectionCategoryDTO, UpdateCategoryOrderDTO, UpdateSelectionCategoryDTO } from '../validators';

@Controller('admin/selection/initial/:templateId/categories')
export class AdminSelectionCategoriesController {
    constructor(private readonly adminSelectionCategoryService: AdminSelectionCategoryService) {

    }
    @Post()
    createCategories(@Param('templateId', ParseIntPipe) templateId: number, @Body() body: CreateSelectionCategoryDTO) {
        return this.adminSelectionCategoryService.createCategory(templateId, body);
    }
    @Get()
    getCategoryList(@Param('templateId', ParseIntPipe) templateId: number) {
        return this.adminSelectionCategoryService.getCategoryList(templateId);
    }
    @Get(':categoryId')
    getCategoryDetails(@Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number) {
        return this.adminSelectionCategoryService.getCategoryDetails(templateId, categoryId);
    }
    @Patch(':categoryId')
    updateCategory(@Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Body() body: UpdateSelectionCategoryDTO) {
        return this.adminSelectionCategoryService.updateCategory(templateId, categoryId, body);
    }
    @Delete(':categoryId')
    deleteCategory(@Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number) {
        return this.adminSelectionCategoryService.deleteCategory(templateId, categoryId);
    }
    @Patch(':categoryId/order')
    changeCategoryOrder(@Param('templateId', ParseIntPipe) templateId: number, @Param('categoryId', ParseIntPipe) categoryId: number, @Body() body: UpdateCategoryOrderDTO) {
        return this.adminSelectionCategoryService.changeCategoryOrder(templateId, categoryId, body);
    }
}
