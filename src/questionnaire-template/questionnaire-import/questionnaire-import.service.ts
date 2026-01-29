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
    question_linked_to_final_selection: string,
    question_linked_to_paint_selection: string,
    question_linked_to_questionnaire: string,
    question_linked_to_phase: string;
    question_linked_phase_ids: string | number; // This is a list of IDs, so we use an array of numbers
    multiple_options: string;
    question_order: number;
    initial_question_order: number;
    paint_question_order: number;
}


// ImportData now combines CategoryDetails and the questions array
export interface ImportData extends CategoryDetails {
    category: string | number | undefined;
    category_linked_to_final_selection: string;
    category_linked_to_paint_selection: string;
    category_linked_to_phase: string;
    category_linked_phase_ids: string | number; // This is a list of IDs, so we use an array of numbers
    category_linked_to_questionnaire: string;
    company_category: boolean;
    question: string,
    question_type: string,
    question_linked_to_contractor_phase: string,
    question_linked_to_final_selection: string,
    question_linked_to_paint_selection: string,
    question_linked_to_questionnaire: string,
    question_linked_to_phase: string;
    question_linked_phase_ids: string | number;
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
export class QuestionnaireImportService {

    constructor(private databaseService: DatabaseService) { }

    async groupContent(content: ImportData[]) {
        const groupedData = [];

        content.forEach((current) => {
            // If the category doesn't exist, initialize it
            if (!groupedData[current.category]) {
                groupedData[current.category] = {
                    category: current.category?.toString(),
                    category_linked_to_questionnaire: current.category_linked_to_questionnaire,
                    category_linked_to_final_selection: current.category_linked_to_final_selection,
                    category_linked_to_paint_selection: current.category_linked_to_paint_selection,
                    category_linked_to_phase: current.category_linked_to_phase,
                    category_linked_phase_ids: current.category_linked_phase_ids,
                    company_category: current.company_category,
                    category_order: current.category_order,
                    questions: [],
                    initial_order: current.initial_order,
                    paint_order: current.paint_order,
                };
            }

            if (current.question) {
                groupedData[current.category].questions.push({
                    question: current.question?.toString(),
                    question_type: current.question_type,
                    question_linked_to_questionnaire: current.question_linked_to_questionnaire,
                    question_linked_to_final_selection: current.question_linked_to_final_selection,
                    question_linked_to_paint_selection: current.question_linked_to_paint_selection,
                    question_linked_to_phase: current.question_linked_to_phase,
                    question_linked_phase_ids: current.question_linked_phase_ids,
                    multiple_options: current.multiple_options,
                    question_order: current.question_order,
                    initial_question_order: current.question_initial_order,
                    paint_question_order: current.question_paint_order,
                });
            }

        });

        // Convert grouped data to array format
        const groupedArray = Object.values(groupedData);
        return groupedArray;
    }

    async processImport(importData: ImportData, templateId: number, companyId: number) {

        try {

            const categoryName = typeof importData.category !== 'string' ? (importData.category).toString() : importData.category;

            let category = await this.databaseService.category.create({
                data: {
                    name: categoryName,
                    isCompanyCategory: importData.company_category ? true : false,
                    linkToInitalSelection: importData.category_linked_to_final_selection === 'true',
                    linkToPaintSelection: importData.category_linked_to_paint_selection === 'true',
                    linkToPhase: importData.category_linked_to_phase === 'true',
                    phaseIds: importData.category_linked_phase_ids
                        ? String(importData.category_linked_phase_ids).split(',').map((id: string) => Number(id.trim()))
                        : [],
                    companyId: companyId,
                    questionnaireOrder: Number(importData.category_order),
                    questionnaireTemplateId: templateId,
                    linkToQuestionnaire: true,
                    initialOrder: Number(importData.initial_order),
                    paintOrder: Number(importData.paint_order),
                },
                omit: {
                    isDeleted: true,
                    isCompanyCategory: false,
                },
            })

            if (!category) return;

            const categoryId = category.id;
            if (importData.questions && importData.questions.length) {
                importData.questions.map(async (que) => {

                    let options = !que.multiple_options ? [] : que.multiple_options
                                                                .split(/\\,/)
                                                                .map(ques => ques.trim())
                                                                .filter(Boolean)       // remove empty strings
                                                                .map(ques => ({ text: ques }));
                                                                
                    let newQuestions = await this.databaseService.templateQuestion.create({
                        data: {
                            question: que.question,
                            questionType: que.question_type,
                            multipleOptions: options,
                            linkToQuestionnaire: true,
                            linkToInitalSelection: que.question_linked_to_final_selection === 'true',
                            linkToPaintSelection: que.question_linked_to_paint_selection === 'true',
                            linkToPhase: que.question_linked_to_phase === 'true',
                            phaseIds: que.question_linked_phase_ids
                                ? String(que.question_linked_phase_ids).split(',').map((id: string) => Number(id.trim()))
                                : [],
                            questionOrder: Number(que.question_order),
                            questionnaireTemplateId: templateId,
                            categoryId: categoryId,
                            initialQuestionOrder: que.initial_question_order,
                            paintQuestionOrder: que.paint_question_order
                        },
                        omit: {
                            isDeleted: true,
                            questionnaireTemplateId: true,
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

    // create template name for all 3 set of templates.
    async createTemplate(body: { templatename: string }, companyId: number) {

        try {
            const response = await this.databaseService.$transaction(async (tx) => {
                const projectEstimator = await tx.projectEstimatorTemplate.create({
                    data: {
                        templateName: body.templatename,
                        companyId
                    }
                });

                const questionnaireTemplate = await tx.questionnaireTemplate.create({
                    data: {
                        name: body.templatename,
                        companyId,
                        isCompanyTemplate: true,
                        templateType: TemplateType.QUESTIONNAIRE,
                        projectEstimatorTemplateId: projectEstimator.id
                    }
                })

                return { questionnaireTemplate, projectEstimator }
            });

            return response.questionnaireTemplate;
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

    async checkTemplateExist(type: string, body: { templateId: string }, companyId: number) {
        try {
            const template = await this.databaseService.questionnaireTemplate.findUnique({
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