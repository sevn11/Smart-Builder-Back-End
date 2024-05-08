import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { AdminCategoriesService } from '../services';
import { CreateCategoryDTO } from '../validators';

@UseGuards(JwtGuard)
@Controller('admin/questionnairetemplate/:templateId/categories')
export class AdminCategoriesController {
    constructor(private adminCategoriesService: AdminCategoriesService) {

    }

    @Post()
    createCategories(@Param('templateId', ParseIntPipe) templateId: number, @Body() body: CreateCategoryDTO) {
        return this.adminCategoriesService.createCategory(templateId, body)
    }
}
