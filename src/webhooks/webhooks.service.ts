import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UpdateCompanyLogoDTO } from './validators';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages } from 'src/core/utils';

@Injectable()
export class WebhooksService {
    constructor(private databaseService: DatabaseService) {

    }

    async updateLogoUrl(companyId: number, body: UpdateCompanyLogoDTO) {
        try {
            let company = await this.databaseService.company.findUniqueOrThrow({
                where: {
                    id: companyId
                }
            });
            await this.databaseService.company.update({
                where: {
                    id: company.id
                },
                data: {
                    logo: body.key
                }
            });
            return { message: ResponseMessages.SUCCESSFUL }
        } catch (error) {
            console.log(error);
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.COMPANY_NOT_FOUND)
                throw new InternalServerErrorException();
            } else {
                throw new InternalServerErrorException();
            }
        }
    }


}
