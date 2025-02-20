import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
  } from "@nestjs/common";
  import { User } from "@prisma/client";
  import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
  import { CreateUpdateCategoryDTO } from "../validators/questionnaire/create-update-category";
  import { PrismaErrorCodes, ResponseMessages, UserTypes } from "src/core/utils";
  import { DatabaseService } from "src/database/database.service";
  import { UpdateCategoryOrderDTO } from "../validators/questionnaire/update-questionnaire_order";
  import { SelectionTemplates } from "src/core/utils/selection-template";
  
  @Injectable()
  export class AdminQuestionnaireCategoryService {
    constructor(private databaseService: DatabaseService) { }
  
    async createCategory(
      user: User,
      templateId: number,
      body: CreateUpdateCategoryDTO
    ) {
      try {
        // Check if User is Admin of the Company.
        if (user.userType == UserTypes.ADMIN) {
          
          let selectionTypes = { linkToInitalSelection: false, linkToPaintSelection: false };
          if (body.isCategoryLinkedSelection && Array.isArray(body.linkedSelections)) {
            selectionTypes = body.linkedSelections.reduce((acc: any, selection: string) => {
              acc.linkToInitalSelection ||= selection === SelectionTemplates.INITIAL_SELECTION;
              acc.linkToPaintSelection ||= selection === SelectionTemplates.PAINT_SELECTION;
              return acc;
            }, { ...selectionTypes });
          }
  
          // Validate template
          let template =
            await this.databaseService.masterQuestionnaireTemplate.findUniqueOrThrow({
              where: {
                id: templateId,
                isDeleted: false,
              },
            });
  
          // Get the highest questionnaireOrder for the given templateId
          let maxOrder = await this.databaseService.masterTemplateCategory.aggregate({
            _max: {
              questionnaireOrder: true,
              initialOrder: true,
              paintOrder: true,
            },
            where: {
              masterQuestionnaireTemplateId: template.id,
              isDeleted: false,
            },
          });
  
          // If body.questionnaireOrder is 0, set it to maxOrder + 1
          let order =
            body.questionnaireOrder === 0
              ? (maxOrder._max.questionnaireOrder ?? 0) + 1
              : body.questionnaireOrder;
  
          let selectionOrder: any = {}
          if (selectionTypes.linkToInitalSelection === true) {
            selectionOrder.initialOrder = (maxOrder._max.initialOrder ?? 0) + 1;
          }
          if (selectionTypes.linkToPaintSelection === true) {
            selectionOrder.paintOrder = (maxOrder._max.paintOrder ?? 0) + 1;
          }
          let category = await this.databaseService.masterTemplateCategory.create({
            data: {
              name: body.name,
              questionnaireOrder: order,
              masterQuestionnaireTemplateId: template.id,
              ...selectionTypes,
              linkToPhase: body.isCategoryLinkedPhase,
              phaseIds: body.isCategoryLinkedPhase ? body.phaseIds : [],
              ...selectionOrder,
            },
            omit: {
              isDeleted: true,
            },
          });
  
          return { category };
        }
      } catch (error) {
        console.log(error);
        // Database Exceptions
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code == PrismaErrorCodes.NOT_FOUND)
            throw new BadRequestException(
              ResponseMessages.QUESTIONNAIRE_TEMPLATE_NOT_FOUND
            );
          else {
            console.log(error.code);
          }
        }
        throw new InternalServerErrorException();
      }
    }
  
    async getCategoryList(user: User, templateId: number) {
      try {
        // Check if User is Admin of the Company.
        if (user.userType == UserTypes.ADMIN) {
          let categories = await this.databaseService.masterTemplateCategory.findMany({
            where: {
              masterQuestionnaireTemplateId: templateId,
              isDeleted: false,
              linkToQuestionnaire: true,
            },
            include: {
              masterQuestions: {
                where: {
                  isDeleted: false,
                  linkToQuestionnaire: true,
                },
                omit: {
                  isDeleted: true,
                  masterTemplateCategoryId: true,
                  masterQuestionnaireTemplateId: true,
                },
                orderBy: {
                  questionOrder: 'asc'
                }
              },
            },
            orderBy: {
              questionnaireOrder: 'asc'
            }
          });
          return { categories };
        }
      } catch (error) {
        console.log(error);
        // Database Exceptions
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code == PrismaErrorCodes.UNIQUE_CONSTRAINT_ERROR)
            throw new BadRequestException(ResponseMessages.UNIQUE_EMAIL_ERROR);
          else {
            console.log(error.code);
          }
        } else if (error instanceof ForbiddenException) {
          throw error;
        } else {
          throw new InternalServerErrorException();
        }
      }
    }
  
    async updateCategory(
      user: User,
      templateId: number,
      categoryId: number,
      body: CreateUpdateCategoryDTO
    ) {
      try {
        // Check if User is Admin of the Company.
        if (user.userType == UserTypes.ADMIN) {
          
          let selectionTypes = { linkToInitalSelection: false, linkToPaintSelection: false };
  
          if (body.isCategoryLinkedSelection && Array.isArray(body.linkedSelections)) {
            selectionTypes = body.linkedSelections.reduce((acc: any, selection: string) => {
              acc.linkToInitalSelection ||= selection === SelectionTemplates.INITIAL_SELECTION;
              acc.linkToPaintSelection ||= selection === SelectionTemplates.PAINT_SELECTION;
              return acc;
            }, { ...selectionTypes });
          }
  
          let category = await this.databaseService.masterTemplateCategory.findUniqueOrThrow({
            where: {
              id: categoryId,
              masterQuestionnaireTemplateId: templateId,
              isDeleted: false,
            },
          });
  
          let maxOrder = await this.databaseService.masterTemplateCategory.aggregate({
            _max: {
              questionnaireOrder: true,
              initialOrder: true,
              paintOrder: true,
            },
            where: {
              masterQuestionnaireTemplateId: templateId,
              isDeleted: false,
            },
          });
  
          let selectionOrder: any = {}
  
          if (category.initialOrder === 0 && selectionTypes.linkToInitalSelection === true) {
            selectionOrder.initialOrder = (maxOrder._max.initialOrder ?? 0) + 1;
          } else {
            selectionOrder.initialOrder = category.initialOrder
          }
          if (category.paintOrder === 0 && selectionTypes.linkToPaintSelection === true) {
            selectionOrder.paintOrder = (maxOrder._max.paintOrder ?? 0) + 1;
          } else {
            selectionOrder.paintOrder = category.paintOrder
          }
          const initialValue = category.initialOrder;
          const paintValue = category.paintOrder;
          let decrement = { initialOrder: false, paintOrder: false }
          if (!selectionTypes.linkToInitalSelection && category.linkToInitalSelection) {
            selectionOrder.initialOrder = 0;
            decrement.initialOrder = true;
          }
          if (!selectionTypes.linkToPaintSelection && category.linkToPaintSelection) {
            selectionOrder.paintOrder = 0;
            decrement.paintOrder = true;
          }
  
          const response = await this.databaseService.$transaction(async (tx) => {
            const category = await tx.masterTemplateCategory.update({
              where: {
                id: categoryId,
                masterQuestionnaireTemplateId: templateId,
                isDeleted: false,
              },
              data: {
                name: body.name,
                ...selectionTypes,
                linkToPhase: body.isCategoryLinkedPhase,
                phaseIds: body.isCategoryLinkedPhase ? body.phaseIds : [],
                ...selectionOrder,
              },
            })
  
            if (decrement.initialOrder) {
              await tx.masterTemplateCategory.updateMany({
                where: {
                  isDeleted: false,
                  masterQuestionnaireTemplateId: templateId,
                  initialOrder: { gt: initialValue }
                },
                data: { initialOrder: { decrement: 1 } }
              })
            }
  
            if (decrement.paintOrder) {
              await tx.masterTemplateCategory.updateMany({
                where: {
                  isDeleted: false,
                  masterQuestionnaireTemplateId: templateId,
                  paintOrder: { gt: paintValue }
                },
                data: { paintOrder: { decrement: 1 } }
              })
            }
  
            return category
          });
          return { category: response, message: ResponseMessages.CATEGORY_UPDATED };
        }
      } catch (error) {
        console.log(error);
        // Database Exceptions
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code == PrismaErrorCodes.NOT_FOUND)
            throw new BadRequestException(ResponseMessages.CATEGORY_NOT_FOUND);
          else {
            console.log(error.code);
          }
        }
        throw new InternalServerErrorException();
      }
    }
  
    async deleteCategory(
      user: User,
      templateId: number,
      categoryId: number
    ) {
      try {
        // Check if User is Admin of the Company.
        if (user.userType == UserTypes.ADMIN) {
          
          // Fetch the category to get its current questionnaireOrder
          const categoryToDelete =
            await this.databaseService.masterTemplateCategory.findUniqueOrThrow({
              where: {
                id: categoryId,
                masterQuestionnaireTemplateId: templateId,
                isDeleted: false,
              },
            });
  
          const deletedCategoryOrder = categoryToDelete.questionnaireOrder;
          const deletedInitialOrder = categoryToDelete.initialOrder;
          const deletedPaintOrder = categoryToDelete.paintOrder;
  
          await this.databaseService.$transaction(async (tx) => {
            await tx.masterTemplateQuestion.updateMany({
              where: {
                masterQuestionnaireTemplateId: templateId,
                masterTemplateCategoryId: categoryToDelete.id,
                isDeleted: false,
              },
              data: { isDeleted: true },
            });
  
            await tx.masterTemplateCategory.update({
              where: {
                id: categoryToDelete.id,
                masterQuestionnaireTemplateId: templateId,
                isDeleted: false,
              },
              data: {
                isDeleted: true,
                questionnaireOrder: 0,
                initialOrder: 0,
                paintOrder: 0
              }
            });
  
            await tx.masterTemplateCategory.updateMany({
              where: {
                masterQuestionnaireTemplateId: templateId,
                isDeleted: false,
                questionnaireOrder: {
                  gt: deletedCategoryOrder,
                },
              },
              data: {
                questionnaireOrder: {
                  decrement: 1,
                },
              },
            });
  
            if (deletedInitialOrder > 0) {
              await tx.masterTemplateCategory.updateMany({
                where: {
                  masterQuestionnaireTemplateId: templateId,
                  isDeleted: false,
                  initialOrder: { gt: deletedInitialOrder }
                },
                data: {
                  initialOrder: { decrement: 1, }
                }
              })
            }
  
            if (deletedCategoryOrder > 0) {
              await tx.masterTemplateCategory.updateMany({
                where: {
                  masterQuestionnaireTemplateId: templateId,
                  isDeleted: false,
                  paintOrder: { gt: deletedPaintOrder }
                },
                data: { paintOrder: { decrement: 1 } }
              })
            }
          });
  
          // Fetch the updated list of categories
          let categories = await this.databaseService.masterTemplateCategory.findMany({
            where: {
              masterQuestionnaireTemplateId: templateId,
              isDeleted: false,
              linkToQuestionnaire: true,
            },
            include: {
              masterQuestions: {
                where: { isDeleted: false, linkToQuestionnaire: true },
                orderBy: { questionOrder: 'asc' }
              }
            },
            orderBy: { questionnaireOrder: 'asc' }
          });
          return { categories, message: ResponseMessages.CATEGORY_DELETED };
        }
      } catch (error) {
        console.log(error);
        // Database Exceptions
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code == PrismaErrorCodes.NOT_FOUND)
            throw new BadRequestException(ResponseMessages.CATEGORY_NOT_FOUND);
          else {
            console.log(error.code);
          }
        }
        throw new InternalServerErrorException();
      }
    }
  
    async changeCategoryOrder(
      user: User,
      templateId: number,
      categoryId: number,
      body: UpdateCategoryOrderDTO
    ) {
      try {
        // Check if User is Admin of the Company.
  
        if (user.userType == UserTypes.ADMIN) {

          let template =
            await this.databaseService.masterQuestionnaireTemplate.findUniqueOrThrow({
              where: {
                id: templateId,
                isDeleted: false,
              },
            });
          let category = await this.databaseService.masterTemplateCategory.findUniqueOrThrow({
            where: {
              id: categoryId,
              masterQuestionnaireTemplateId: templateId,
              isDeleted: false,
            },
          });
  
          let currentOrder = category.questionnaireOrder;
  
          if (currentOrder > body.questionnaireOrder) {
            // Category is moving up
            let result = await this.databaseService.$transaction([
              this.databaseService.masterTemplateCategory.updateMany({
                where: {
                  masterQuestionnaireTemplateId: templateId,
                  isDeleted: false,
                  questionnaireOrder: {
                    gte: body.questionnaireOrder,
                    lt: currentOrder,
                  },
                },
                data: {
                  questionnaireOrder: {
                    increment: 1,
                  },
                },
              }),
              this.databaseService.masterTemplateCategory.update({
                where: {
                  id: categoryId,
                  masterQuestionnaireTemplateId: templateId,
                  isDeleted: false,
                },
                data: {
                  questionnaireOrder: body.questionnaireOrder,
                },
              }),
              this.databaseService.masterQuestionnaireTemplate.findUniqueOrThrow({
                where: {
                  id: templateId,
                  isDeleted: false,
                },
                omit: {
                  isDeleted: true,
                },
                include: {
                  masterTemplateCategories: {
                    where: {
                      isDeleted: false,
                      linkToQuestionnaire: true,
                    },
                    omit: {
                      isDeleted: true,
                    },
                    include: {
                      masterQuestions: {
                        where: {
                          isDeleted: false,
                          linkToQuestionnaire: true,
                        },
                        orderBy: {
                          questionOrder: 'asc'
                        }
                      },
                    },
                    orderBy: {
                      questionnaireOrder: "asc",
                    },
                  },
                },
              }),
            ]);
  
            return {
              template: result[2],
              message: ResponseMessages.CATEGORY_ORDER_UPDATED,
            };
          } else if (currentOrder < body.questionnaireOrder) {
            // Category is moving down
            let result = await this.databaseService.$transaction([
              this.databaseService.masterTemplateCategory.updateMany({
                where: {
                  masterQuestionnaireTemplateId: templateId,
                  isDeleted: false,
                  questionnaireOrder: {
                    gt: currentOrder,
                    lte: body.questionnaireOrder,
                  },
                },
                data: {
                  questionnaireOrder: {
                    decrement: 1,
                  },
                },
              }),
              this.databaseService.masterTemplateCategory.update({
                where: {
                  id: categoryId,
                    masterQuestionnaireTemplateId: templateId,
                  isDeleted: false,
                },
                data: {
                  questionnaireOrder: body.questionnaireOrder,
                },
              }),
              this.databaseService.masterQuestionnaireTemplate.findUniqueOrThrow({
                where: {
                  id: templateId,
                  isDeleted: false,
                },
                omit: {
                  isDeleted: true,
                },
                include: {
                  masterTemplateCategories: {
                    where: {
                      isDeleted: false,
                      linkToQuestionnaire: true,
                    },
                    omit: {
                      isDeleted: true,
                    },
                    include: {
                      masterQuestions: {
                        where: {
                          isDeleted: false,
                          linkToQuestionnaire: true,
                        },
                        orderBy: {
                          questionOrder: 'asc'
                        }
                      },
                    },
                    orderBy: {
                      questionnaireOrder: "asc",
                    },
                  },
                },
              }),
            ]);
            return {
              template: result[2],
              message: ResponseMessages.CATEGORY_ORDER_UPDATED,
            };
          }
        }
      } catch (error) {
        console.log(error);
        // Database Exceptions
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code == PrismaErrorCodes.NOT_FOUND)
            throw new BadRequestException(
              ResponseMessages.QUESTIONNAIRE_TEMPLATE_NOT_FOUND
            );
          else {
            console.log(error.code);
          }
        }
        throw new InternalServerErrorException();
      }
    }
  }
  