import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { PrismaErrorCodes, ResponseMessages, UserTypes } from "src/core/utils";
import { DatabaseService } from "src/database/database.service";
import { CreateUpdateAnswerDTO } from "./validators/create-update-answer";

@Injectable()
export class TemplateQuestionAnswerService {
  constructor(private databaseService: DatabaseService) { }

  async addAnswer(
    user: User,
    companyId: number,
    templateId: number,
    categoryId: number,
    body: CreateUpdateAnswerDTO
  ) {
    try {
      // Check if User is Admin of the Company
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

        let answer = await this.databaseService.templateQuestionAnswer.create({
          data: {
            questionId: body.questionId,
            answerIds: body.answerIds,
            answerText: body.answerText,
          },
        });

        const category = await this.databaseService.category.findUniqueOrThrow({
          where: {
            id: categoryId,
            isCompanyCategory: true,
            isDeleted: false,
          },
          include: {
            questions: {
              where: {
                isDeleted: false,
              },
              orderBy: {
                questionOrder: 'asc'
              },
              include: {
                answers: {},
              },
            },
          },
        });

        return { category: category, message: ResponseMessages.QUESTION_ADDED };
      }
    } catch (error) {
      console.log(error);
      // Database Exceptions
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code == PrismaErrorCodes.NOT_FOUND)
          throw new BadRequestException(ResponseMessages.QUESTION_NOT_FOUND);
        else {
          console.log(error.code);
        }
      }
      throw new InternalServerErrorException();
    }
  }

  async updateAnswer(
    user: User,
    companyId: number,
    templateId: number,
    categoryId: number,
    questionId: number,
    body: CreateUpdateAnswerDTO
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

        // First, find the answer using questionId
        const answer =
          await this.databaseService.templateQuestionAnswer.findFirst({
            where: {
              questionId: questionId,
            },
          });

        if (!answer) {
          throw new Error("Answer not found");
        }

        // Then, update the answer using its unique id
        const updatedAnswer =
          await this.databaseService.templateQuestionAnswer.update({
            where: {
              id: answer.id, // Use the unique id here
            },
            data: {
              answerIds: body.answerIds,
              answerText: body.answerText,
            },
          });

        // Fetch the updated category with updated questions and their answers
        const category = await this.databaseService.category.findUniqueOrThrow({
          where: {
            id: categoryId,
            isCompanyCategory: true,
            isDeleted: false,
          },
          include: {
            questions: {
              where: {
                isDeleted: false,
              },
              orderBy: {
                questionOrder: 'asc'
              },
              include: {
                answers: {},
              },
            },
          },
        });

        return { category, message: ResponseMessages.QUESTION_UPDATED };
      }
    } catch (error) {
      console.log(error);
      // Database Exceptions
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code == PrismaErrorCodes.NOT_FOUND)
          throw new BadRequestException(ResponseMessages.QUESTION_NOT_FOUND);
        else {
          console.log(error.code);
        }
      }
      throw new InternalServerErrorException();
    }
  }
}
