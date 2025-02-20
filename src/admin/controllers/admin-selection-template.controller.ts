import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { JwtGuard } from 'src/core/guards';
import { CreateCategoryDTO } from '../validators/selection/create-category';
import { QuestionDTO } from '../validators/selection/question';
import { CategoryOrderDTO } from '../validators/selection/order';
import { TemplateNameDTO } from '../validators/selection/template';
import { QuestionOrderDTO } from '../validators/selection/question-order';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminSelectionTemplateService } from '../services';

@UseGuards(JwtGuard)
@Controller('admin/master-selection-template')
export class AdminSelectionTemplateController {

    constructor(private AdminSelectionTemplateService: AdminSelectionTemplateService) { }

    @HttpCode(HttpStatus.OK)
    @Post(':type')
    createTemplateName(
        @GetUser() user: User,
        @Param('type') type: string,
        @Body() body: TemplateNameDTO
    ) {
        return this.AdminSelectionTemplateService.createTemplateName(user, type, body);
    }

    @HttpCode(HttpStatus.OK)
    @Patch(':type/:templateId')
    updateTemplateName(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: TemplateNameDTO
    ) {
        return this.AdminSelectionTemplateService.updateTemplateName(user, type, templateId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Patch('/:type/:templateId/re-order')
    changeCategoryOrder(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: CategoryOrderDTO
    ) {
        return this.AdminSelectionTemplateService.changeCategoryOrder(user, type, templateId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Patch('/:templateId/:type/re-order/:categoryId/:questionId')
    changeQuestionOrder(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('questionId', ParseIntPipe) questionId: number,
        @Body() body: QuestionOrderDTO
    ) {
        return this.AdminSelectionTemplateService.changeQuestionOrder(user, type, templateId, questionId, categoryId, body);
    }

    // List all the selection template whether inital selection or paint selection.
    // :type can be initial-selection or paint-selection
    @Get('/:type')
    @HttpCode(HttpStatus.OK)
    getSelectionTemplate(
        @GetUser() user: User,
        @Param('type') type: string
    ) {
        return this.AdminSelectionTemplateService.getSelectionTemplate(user, type);
    }

    // Get the category, question and answer
    @Get('/:type/:templateId/data')
    @HttpCode(HttpStatus.OK)
    getTemplateContent(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('templateId', ParseIntPipe) templateId: number
    ) {
        return this.AdminSelectionTemplateService.getSelectionTemplateContent(user, type, templateId);
    }

    // Create category
    @Post('/:type/:templateId/category')
    @HttpCode(HttpStatus.CREATED)
    createSelectionCategory(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: CreateCategoryDTO
    ) {
        return this.AdminSelectionTemplateService.createSelectionTemplateCategory(user, type, templateId, body);
    }

    // Update the category
    @Patch('/:type/:templateId/category/:categoryId')
    @HttpCode(HttpStatus.OK)
    updateSelectionCategory(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Body() body: CreateCategoryDTO
    ) {
        return this.AdminSelectionTemplateService.updateSelectionCategory(user, type, templateId, categoryId, body);
    }

    @Delete('/:type/:templateId')
    @HttpCode(HttpStatus.OK)
    deleteTemplate(
        @GetUser() user: User,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('type') type: string,
    ) {
        return this.AdminSelectionTemplateService.deleteTemplate(user, templateId, type);
    }

    // delete the category
    @Delete('/:type/:templateId/category/:categoryId')
    @HttpCode(HttpStatus.OK)
    deleteCategory(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number
    ) {
        return this.AdminSelectionTemplateService.deleteCategory(user, type, templateId, categoryId);
    }

    // Create label.
    @Post('/:type/:templateId/category/:categoryId/label')
    @HttpCode(HttpStatus.CREATED)
    createLabel(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Body() body: QuestionDTO
    ) {
        return this.AdminSelectionTemplateService.createLabel(user, type, templateId, categoryId, body);
    }

    // update the label
    @Patch('/:type/:templateId/category/:categoryId/label/:labelId')
    @HttpCode(HttpStatus.OK)
    updateLabel(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Param('labelId', ParseIntPipe) labelId: number,
        @Body() body: QuestionDTO
    ) {
        return this.AdminSelectionTemplateService.updateLabel(user, type, templateId, categoryId, labelId, body);
    }

    // delete the label
    @Delete('/:type/:templateId/category/:categoryId/label/:labelId')
    @HttpCode(HttpStatus.OK)
    deleteLabel(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Param('labelId', ParseIntPipe) labelId: number,
    ) {
        return this.AdminSelectionTemplateService.deleteLabel(user, type, templateId, categoryId, labelId)
    }

    @Post('/:type/import-template')
    @HttpCode(HttpStatus.OK)
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
        @Param('type') type: string,
    ) {
        return this.AdminSelectionTemplateService.importTemplate(user, file, body, type)
    }
}
