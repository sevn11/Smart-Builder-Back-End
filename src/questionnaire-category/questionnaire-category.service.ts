import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { CreateUpdateCategoryDTO } from "./validators/create-update-category";
import { PrismaErrorCodes, ResponseMessages, UserTypes } from "src/core/utils";
import { DatabaseService } from "src/database/database.service";
import { UpdateCategoryOrderDTO } from "./validators/update-questionnaire_order";
import { SelectionTemplates } from "src/core/utils/selection-template";

@Injectable()
export class QuestionnaireCategoryService {
  constructor(private databaseService: DatabaseService) { }

  async createCategory(
    user: User,
    companyId: number,
    templateId: number,
    body: CreateUpdateCategoryDTO
  ) {
    try {
      // Check if User is Admin of the Company.
      if (
        user.userType == UserTypes.ADMIN ||
        (user.userType == UserTypes.BUILDER && user.companyId === companyId)
      ) {
        let company = await this.databaseService.company.findUnique({
          where: {
            id: companyId,
            isDeleted: false,
          },
        });
        if (!company) {
          throw new ForbiddenException("Action Not Allowed");
        }

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
          await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
            where: {
              id: templateId,
              isCompanyTemplate: true,
              isDeleted: false,
            },
          });

        // Get the highest questionnaireOrder for the given templateId
        let maxOrder = await this.databaseService.category.aggregate({
          _max: {
            questionnaireOrder: true,
            initialOrder: true,
            paintOrder: true,
          },
          where: {
            questionnaireTemplateId: template.id,
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
        let category = await this.databaseService.category.create({
          data: {
            name: body.name,
            isCompanyCategory: true,
            companyId: company.id,
            questionnaireOrder: order,
            questionnaireTemplateId: template.id,
            ...selectionTypes,
            ...selectionOrder,
            linkToPhase: body.isCategoryLinkedContractor,
            contractorIds: body.isCategoryLinkedContractor ? body.contractorIds : []
          },
          omit: {
            isDeleted: true,
            isCompanyCategory: false,
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

  async getCategoryList(user: User, companyId: number, templateId: number) {
    try {
      // Check if User is Admin of the Company.
      if (
        user.userType == UserTypes.ADMIN ||
        (user.userType == UserTypes.BUILDER && user.companyId === companyId)
      ) {
        let company = await this.databaseService.company.findUnique({
          where: {
            id: companyId,
            isDeleted: false,
          },
        });
        if (!company) {
          throw new ForbiddenException("Action Not Allowed");
        }

        let categories = await this.databaseService.category.findMany({
          where: {
            questionnaireTemplateId: templateId,
            isCompanyCategory: true,
            isDeleted: false,
            linkToQuestionnaire: true,
          },
          include: {
            questions: {
              where: {
                isDeleted: false,
                linkToQuestionnaire: true,
              },
              omit: {
                isDeleted: true,
                categoryId: true,
                questionnaireTemplateId: true,
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
    companyId: number,
    templateId: number,
    categoryId: number,
    body: CreateUpdateCategoryDTO
  ) {
    try {
      // Check if User is Admin of the Company.
      if (
        user.userType == UserTypes.ADMIN ||
        (user.userType == UserTypes.BUILDER && user.companyId === companyId)
      ) {
        let company = await this.databaseService.company.findUnique({
          where: {
            id: companyId,
            isDeleted: false,
          },
        });
        if (!company) {
          throw new ForbiddenException("Action Not Allowed");
        }
        let selectionTypes = { linkToInitalSelection: false, linkToPaintSelection: false };

        if (body.isCategoryLinkedSelection && Array.isArray(body.linkedSelections)) {
          selectionTypes = body.linkedSelections.reduce((acc: any, selection: string) => {
            acc.linkToInitalSelection ||= selection === SelectionTemplates.INITIAL_SELECTION;
            acc.linkToPaintSelection ||= selection === SelectionTemplates.PAINT_SELECTION;
            return acc;
          }, { ...selectionTypes });
        }

        let category = await this.databaseService.category.findUniqueOrThrow({
          where: {
            id: categoryId,
            questionnaireTemplateId: templateId,
            isCompanyCategory: true,
            isDeleted: false,
          },
        });

        let maxOrder = await this.databaseService.category.aggregate({
          _max: {
            questionnaireOrder: true,
            initialOrder: true,
            paintOrder: true,
          },
          where: {
            questionnaireTemplateId: templateId,
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

        category = await this.databaseService.category.update({
          where: {
            id: categoryId,
            questionnaireTemplateId: templateId,
            isCompanyCategory: true,
            isDeleted: false,
          },
          data: {
            name: body.name,
            ...selectionTypes,
            ...selectionOrder,
            linkToPhase: body.isCategoryLinkedContractor,
            contractorIds: body.isCategoryLinkedContractor ? body.contractorIds : [],
          },
        });
        return { category, message: ResponseMessages.CATEGORY_UPDATED };
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
    companyId: number,
    templateId: number,
    categoryId: number
  ) {
    try {
      // Check if User is Admin of the Company.
      if (
        user.userType == UserTypes.ADMIN ||
        (user.userType == UserTypes.BUILDER && user.companyId === companyId)
      ) {
        let company = await this.databaseService.company.findUnique({
          where: { id: companyId, isDeleted: false },
        });
        if (!company) {
          throw new ForbiddenException("Action Not Allowed");
        }
        // Fetch the category to get its current questionnaireOrder
        const categoryToDelete =
          await this.databaseService.category.findUniqueOrThrow({
            where: {
              id: categoryId,
              questionnaireTemplateId: templateId,
              isCompanyCategory: true,
              isDeleted: false,
            },
          });

        const deletedCategoryOrder = categoryToDelete.questionnaireOrder;
        const deletedInitialOrder = categoryToDelete.initialOrder;
        const deletedPaintOrder = categoryToDelete.paintOrder;

        await this.databaseService.$transaction(async (tx) => {
          await tx.templateQuestion.updateMany({
            where: {
              questionnaireTemplateId: templateId,
              categoryId: categoryToDelete.id,
              isDeleted: false,
            },
            data: { isDeleted: true },
          });

          await tx.category.update({
            where: {
              id: categoryToDelete.id,
              questionnaireTemplateId: templateId,
              isCompanyCategory: true,
              isDeleted: false,
            },
            data: {
              isDeleted: true,
              questionnaireOrder: 0,
              initialOrder: 0,
              paintOrder: 0
            }
          });

          await tx.category.updateMany({
            where: {
              questionnaireTemplateId: templateId,
              isCompanyCategory: true,
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
            await tx.category.updateMany({
              where: {
                questionnaireTemplateId: templateId,
                isCompanyCategory: true,
                isDeleted: false,
                initialOrder: { gt: deletedInitialOrder }
              },
              data: {
                initialOrder: { decrement: 1, }
              }
            })
          }

          if (deletedCategoryOrder > 0) {
            await tx.category.updateMany({
              where: {
                questionnaireTemplateId: templateId,
                isCompanyCategory: true,
                isDeleted: false,
                paintOrder: { gt: deletedPaintOrder }
              },
              data: { paintOrder: { decrement: 1 } }
            })
          }
        });

        // Fetch the updated list of categories
        let categories = await this.databaseService.category.findMany({
          where: {
            questionnaireTemplateId: templateId,
            isCompanyCategory: true,
            isDeleted: false,
            linkToQuestionnaire: true,
          },
          include: {
            questions: {
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
    companyId: number,
    templateId: number,
    categoryId: number,
    body: UpdateCategoryOrderDTO
  ) {
    try {
      // Check if User is Admin of the Company.

      if (
        user.userType == UserTypes.ADMIN ||
        (user.userType == UserTypes.BUILDER && user.companyId === companyId)
      ) {
        let company = await this.databaseService.company.findUnique({
          where: {
            id: companyId,
            isDeleted: false,
          },
        });
        if (!company) {
          throw new ForbiddenException("Action Not Allowed");
        }

        let template =
          await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
            where: {
              id: templateId,
              isCompanyTemplate: true,
              isDeleted: false,
            },
          });
        let category = await this.databaseService.category.findUniqueOrThrow({
          where: {
            id: categoryId,
            questionnaireTemplateId: templateId,
            isCompanyCategory: true,
            isDeleted: false,
          },
        });

        let currentOrder = category.questionnaireOrder;

        if (currentOrder > body.questionnaireOrder) {
          // Category is moving up
          let result = await this.databaseService.$transaction([
            this.databaseService.category.updateMany({
              where: {
                questionnaireTemplateId: templateId,
                isCompanyCategory: true,
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
            this.databaseService.category.update({
              where: {
                id: categoryId,
                questionnaireTemplateId: templateId,
                isCompanyCategory: true,
                isDeleted: false,
              },
              data: {
                questionnaireOrder: body.questionnaireOrder,
              },
            }),
            this.databaseService.questionnaireTemplate.findUniqueOrThrow({
              where: {
                id: templateId,
                isDeleted: false,
                isCompanyTemplate: true,
              },
              omit: {
                companyId: true,
                isDeleted: true,
                isCompanyTemplate: false,
              },
              include: {
                categories: {
                  where: {
                    isDeleted: false,
                    isCompanyCategory: true,
                    linkToQuestionnaire: true,
                  },
                  omit: {
                    isDeleted: true,
                    isCompanyCategory: false,
                    companyId: true,
                  },
                  include: {
                    questions: {
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
            this.databaseService.category.updateMany({
              where: {
                questionnaireTemplateId: templateId,
                isCompanyCategory: true,
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
            this.databaseService.category.update({
              where: {
                id: categoryId,
                questionnaireTemplateId: templateId,
                isCompanyCategory: true,
                isDeleted: false,
              },
              data: {
                questionnaireOrder: body.questionnaireOrder,
              },
            }),
            this.databaseService.questionnaireTemplate.findUniqueOrThrow({
              where: {
                id: templateId,
                isDeleted: false,
                isCompanyTemplate: true,
              },
              omit: {
                companyId: true,
                isDeleted: true,
                isCompanyTemplate: false,
              },
              include: {
                categories: {
                  where: {
                    isDeleted: false,
                    isCompanyCategory: true,
                    linkToQuestionnaire: true,
                  },
                  omit: {
                    isDeleted: true,
                    isCompanyCategory: false,
                    companyId: true,
                  },
                  include: {
                    questions: {
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
