import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, TemplateType } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';

// import category details

// import category details
export interface CategoryDetails {
    _category: string | number | undefined;
    category_linked_to_initial_selection: string;
    category_linked_to_paint_selection: string;
    category_linked_to_contractor_phase: string;
    linked_phases_id: string | number; // This is a list of IDs, so we use an array of numbers
    category_linked_to_questionnaire: string;
    company_category: boolean;
    category_order: number;
}

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
    initial_question_order: number;
    paint_question_order: number;
}


// ImportData now combines CategoryDetails and the questions array
export interface ImportData extends CategoryDetails {
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
    initial_selection_order: number;
    initial_order: number;
    paint_selection_order: number;
    paint_order: number;
    question_order: number;
    questions: QuestionDetails[];
    question_initial_order: number;
    question_paint_order: number;
}

@Injectable()
export class MasterQuestionnaireImportService {

    constructor(private databaseService: DatabaseService) { }

    async groupContent(content: ImportData[]) {
        const groupedData = [];

        content.forEach((current) => {
            // If the category doesn't exist, initialize it
            if (!groupedData[current.category]) {
                groupedData[current.category] = {
                    category: current.category?.toString(),
                    category_linked_to_questionnaire: current.category_linked_to_questionnaire,
                    company_category: current.company_category,
                    category_order: current.category_order,
                    questions: [],
                };
            }

            if (current.question) {
                groupedData[current.category].questions.push({
                    question: current.question?.toString(),
                    question_type: current.question_type,
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

    async processImport(importData: ImportData, templateId: number) {

        try {

            const categoryName = typeof importData.category !== 'string' ? (importData.category).toString() : importData.category;

            let category = await this.databaseService.masterTemplateCategory.create({
                data: {
                    name: categoryName,
                    questionnaireOrder: Number(importData.category_order),
                    masterQuestionnaireTemplateId: templateId,
                    linkToQuestionnaire: true
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

                    let newQuestions = await this.databaseService.masterTemplateQuestion.create({
                        data: {
                            question: que.question,
                            questionType: que.question_type,
                            multipleOptions: options,
                            linkToQuestionnaire: true,
                            questionOrder: Number(que.question_order),
                            masterQuestionnaireTemplateId: templateId,
                            masterTemplateCategoryId: categoryId,
                        },
                        omit: {
                            isDeleted: true,
                            masterQuestionnaireTemplateId: true,
                            masterTemplateCategoryId: true
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

    async checkTemplateExist(type: string, body: { templateId: string }) {
        try {
            const template = await this.databaseService.masterQuestionnaireTemplate.findUnique({
                where: {
                    id: Number(body.templateId)
                }
            })
            if (!template || !template.id) {
                throw new ForbiddenException('Template not found')
            }
            return { ...template }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }

            throw new InternalServerErrorException();
        }
    }
}