import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, TemplateType } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';

// import quesiton
export interface QuestionDetails {
    question: string,
    question_type: string,
    question_linked_to_contractor_phase: string,
    question_linked_to_initial_selection: string,
    question_linked_to_paint_selection: string,
    question_linked_to_questionnaire: string,
    phases_attached_in_questions: string;
    multiple_options: string;
    question_order: number;
}


export interface ImportData {
    category: string | number | undefined;
    category_linked_to_initial_selection: string;
    category_linked_to_paint_selection: string;
    category_linked_to_contractor_phase: string;
    linked_phases_id: string | number; // This is a list of IDs, so we use an array of numbers
    category_linked_to_questionnaire: string;
    company_category: boolean;
    question: string,
    question_type: string,
    question_linked_to_contractor_phase: string,
    question_linked_to_initial_selection: string,
    question_linked_to_paint_selection: string,
    question_linked_to_questionnaire: string,
    phases_attached_in_questions: string;
    multiple_options: string;
    category_order: number;
    question_order: number;
    questions: QuestionDetails[]
}

@Injectable()
export class ImportSelectionTemplateService {
    constructor(private databaseService: DatabaseService) { }

    // group the content for import processing
    async groupContent(content: ImportData[]) {
        const groupedData = [];

        content.forEach((current) => {
            // If the category doesn't exist, initialize it
            if (!groupedData[current.category]) {
                groupedData[current.category] = {
                    category: current.category?.toString(),
                    category_linked_to_initial_selection: current.category_linked_to_initial_selection,
                    category_linked_to_paint_selection: current.category_linked_to_paint_selection,
                    category_linked_to_questionnaire: current.category_linked_to_questionnaire,
                    company_category: current.company_category,
                    category_order: current.category_order,
                    questions: [] // Initialize an empty array for questions
                };
            }

            if (current.question) {
                groupedData[current.category].questions.push({
                    question: current.question?.toString(),
                    question_type: current.question_type,
                    question_linked_to_initial_selection: current.question_linked_to_initial_selection,
                    question_linked_to_paint_selection: current.question_linked_to_paint_selection,
                    question_linked_to_questionnaire: current.question_linked_to_questionnaire,
                    multiple_options: current.multiple_options,
                    question_order: current.question_order,
                });
            }

        });

        // Convert grouped data to array format
        const groupedArray = Object.values(groupedData);
        return groupedArray;
    }

    // process the import
    async processImport(importData: ImportData, templateId: number, type: string) {
        try {
            const categoryName = typeof importData.category !== 'string' ? (importData.category)?.toString() : importData.category;
            let whereClause: any = {}
            let selectionOrder: any = {}
            if (type === TemplateType.SELECTION_INITIAL) {
                whereClause.linkToInitalSelection = true;
                whereClause.linkToPaintSelection = false;
                selectionOrder.initialOrder = Number(importData.category_order)
            }
            if (type === TemplateType.SELECTION_PAINT) {
                whereClause.linkToPaintSelection = true
                whereClause.linkToInitalSelection = false;
                selectionOrder.paintOrder = Number(importData.category_order)
            }

            let category = await this.databaseService.masterTemplateCategory.create({
                data: {
                    name: categoryName,
                    questionnaireOrder: 0,
                    masterQuestionnaireTemplateId: templateId,
                    ...whereClause,
                    ...selectionOrder,
                    linkToQuestionnaire: false,
                },
                omit: {
                    isDeleted: true,
                },
            })

            if (!category) return;
            const categoryId = category.id;
            if (importData.questions && importData.questions.length) {
                importData.questions.map(async (que) => {
                    let options = !que.multiple_options ? [] : que.multiple_options.split(', ').map((ques) => ({ text: ques }))

                    let newQuestions = await this.databaseService.templateQuestion.create({
                        data: {
                            question: que.question,
                            questionType: que.question_type,
                            multipleOptions: options,
                            questionOrder: 0,
                            ...whereClause,
                            masterQuestionnaireTemplateId: templateId,
                            masterTemplateCategoryId: categoryId,
                            linkToQuestionnaire: false,
                            initialQuestionOrder: type === TemplateType.SELECTION_INITIAL ? que.question_order : 0,
                            paintQuestionOrder: type === TemplateType.SELECTION_PAINT ? que.question_order : 0,
                        },
                        omit: {
                            isDeleted: true,
                            categoryId: true
                        }
                    })
                    return newQuestions;
                })
            }

            return category;

        } catch (error) {
            console.log(error);
            return false;
        }
    }

    async checkTemplateExist(type: string, body: { templateId: string }, selectionType: string) {
        try {
            const template = await this.databaseService.masterQuestionnaireTemplate.findUnique({
                where: {
                    id: Number(body.templateId),
                    isDeleted: false,
                }
            })

            if (!template || !template.id) {
                throw new ForbiddenException('Template not found');
            }

            return { ...template }
        } catch (error) {
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }
}
