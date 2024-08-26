import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class TermsAndConditionService {

    constructor(private databaseService: DatabaseService) { }

    async getContent() {
        try {
            return this.databaseService.termsAndCondition.findFirstOrThrow();
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
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
