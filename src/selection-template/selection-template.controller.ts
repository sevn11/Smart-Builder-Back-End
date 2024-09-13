import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { SelectionTemplateService } from './selection-template.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { JwtGuard } from 'src/core/guards';
import { CreateCategoryDTO } from './validators/create-category';
import { LabelDTO } from './validators/label';
import { AnswerDTO } from './validators/answer';
import { CategoryOrderDTO } from './validators/order';
import { UpdateTemplateNameDTO } from './validators/template';
import { QuestionOrderDTO } from './validators/question-order';

@UseGuards(JwtGuard)
@Controller('companies/:companyId/selection-template')
export class SelectionTemplateController {

    constructor(private selectionTemplateService: SelectionTemplateService) { }

    @HttpCode(HttpStatus.OK)
    @Patch(':type/:templateId')
    updateTemplateName(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('type') type: string,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: UpdateTemplateNameDTO
    ) {
        return this.selectionTemplateService.updateTemplateName(user, type, companyId, templateId, body);
    }



    @HttpCode(HttpStatus.OK)
    @Patch('/:type/:templateId/re-order')
    changeCategoryOrder(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('type') type: string,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: CategoryOrderDTO
    ) {
        return this.selectionTemplateService.changeCategoryOrder(user, companyId, type, templateId, body);
    }

    @HttpCode(HttpStatus.OK)
    @Patch('/:templateId/:type/re-order/:categoryId/:questionId')
    changeQuestionOrder(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('type') type: string,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('questionId', ParseIntPipe) questionId: number,
        @Body() body: QuestionOrderDTO
    ) {
        return this.selectionTemplateService.changeQuestionOrder(user, companyId, type, templateId, questionId, categoryId, body);
    }

    // List all the selection template whether inital selection or paint selection.
    // :type can be initial-selection or paint-selection
    @Get('/:type')
    @HttpCode(HttpStatus.OK)
    getSelectionTemplate(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('type') type: string
    ) {
        return this.selectionTemplateService.getSelectionTemplate(user, companyId, type);
    }

    // Get the category, question and answer
    @Get('/:type/:templateId/data')
    @HttpCode(HttpStatus.OK)
    getTemplateContent(
        @GetUser() user: User,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('type') type: string,
        @Param('templateId', ParseIntPipe) templateId: number
    ) {
        return this.selectionTemplateService.getSelectionTemplateContent(user, companyId, type, templateId);
    }

    // Create category
    @Post('/:type/:templateId/category')
    @HttpCode(HttpStatus.CREATED)
    createSelectionCategory(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Body() body: CreateCategoryDTO
    ) {
        return this.selectionTemplateService.createSelectionTemplateCategory(user, type, companyId, templateId, body);
    }

    // Update the category
    @Patch('/:type/:templateId/category/:categoryId')
    @HttpCode(HttpStatus.OK)
    updateSelectionCategory(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Body() body: CreateCategoryDTO
    ) {
        return this.selectionTemplateService.updateSelectionCategory(user, type, companyId, templateId, categoryId, body);
    }

    // delete the category
    @Delete('/:type/:templateId/category/:categoryId')
    @HttpCode(HttpStatus.OK)
    deleteCategory(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number
    ) {
        return this.selectionTemplateService.deleteCategory(user, type, companyId, templateId, categoryId);
    }

    // Create label.
    @Post('/:type/:templateId/category/:categoryId/label')
    @HttpCode(HttpStatus.CREATED)
    createLabel(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Body() body: LabelDTO
    ) {
        return this.selectionTemplateService.createLabel(user, type, companyId, templateId, categoryId, body);
    }

    // update the label
    @Patch('/:type/:templateId/category/:categoryId/label/:labelId')
    @HttpCode(HttpStatus.OK)
    updateLabel(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Param('labelId', ParseIntPipe) labelId: number,
        @Body() body: LabelDTO
    ) {
        return this.selectionTemplateService.updateLabel(user, type, companyId, templateId, categoryId, labelId, body);
    }

    // delete the label
    @Delete('/:type/:templateId/category/:categoryId/label/:labelId')
    @HttpCode(HttpStatus.OK)
    deleteLabel(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Param('labelId', ParseIntPipe) labelId: number,
    ) {
        return this.selectionTemplateService.deleteLabel(user, type, companyId, templateId, categoryId, labelId)
    }

    // create answer
    @Post('/:type/:templateId/category/:categoryId')
    @HttpCode(HttpStatus.OK)
    createAnswer(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Body() body: AnswerDTO
    ) {
        return this.selectionTemplateService.createAnswer(user, type, companyId, templateId, categoryId, body);
    }

    // update answer
    @Patch('/:type/:templateId/:categoryId/question/:quesId')
    @HttpCode(HttpStatus.OK)
    updateAnswer(
        @GetUser() user: User,
        @Param('type') type: string,
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('templateId', ParseIntPipe) templateId: number,
        @Param('categoryId', ParseIntPipe) categoryId: number,
        @Body() body: AnswerDTO
    ) {
        return this.selectionTemplateService.updateAnswer(user, type, companyId, templateId, categoryId, body);
    }
}
