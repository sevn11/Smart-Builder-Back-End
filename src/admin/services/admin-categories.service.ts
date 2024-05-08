import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateCategoryDTO } from '../validators';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages } from 'src/core/utils';

@Injectable()
export class AdminCategoriesService {
    constructor(private databaseService: DatabaseService) {

    }
    async createCategory(templateId: number, body: CreateCategoryDTO) {
        try {
            let template = await this.databaseService.questionnaireTemplate.findUniqueOrThrow({
                where: {
                    id: templateId,
                    isCompanyTemplate: false,
                    isDeleted: false,

                },
            });
            let category = await this.databaseService.category.create({
                data: {
                    name: body.name,
                    isCompanyCategory: false,
                    questionnaireOrder: body.questionnaireOrder,
                    linkToPhase: body.linkToPhase,
                    linkToSelection: body.linkToSelection,
                    questionnaireTemplateId: template.id
                },
                omit: {
                    isDeleted: true,
                    isCompanyCategory: true,
                    companyId: true
                }
            });
            return { category }
        } catch (error) {
            console.log(error)
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.QUESTIONNAIRE_TEMPLATE_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            }
            throw new InternalServerErrorException();
        }
    }
}
