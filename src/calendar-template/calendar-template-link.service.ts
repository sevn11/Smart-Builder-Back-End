import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { TypeEnum, User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { CalendarTemplateService } from './calendar-template.service';

export type LinkBody = {
    "source": string;
    "target": string,
    "type": "0" | "1" | "2" | "3"
}

export enum MapToType {
    ENUM_0 = "FINISH_TO_START",
    ENUM_1 = "START_TO_START",
    ENUM_2 = "FINISH_TO_FINISH",
    ENUM_3 = "START_TO_FINISH",
}

@Injectable()
export class CalendarTemplateLinkService {
    constructor(private databaseService: DatabaseService, private calendarTemplateService: CalendarTemplateService) { }

    async createLink(user: User, companyId: number, templateId: number, body: LinkBody) {
        try {
            if (user.userType === UserTypes.ADMIN || user.userType === UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType === UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const template = await this.databaseService.calendarTemplate.findUnique({
                    where: { id: templateId, isDeleted: false }
                })
                if (!template) throw new ForbiddenException("Action Not Allowed");

                const [source, target] = await Promise.all([
                    await this.databaseService.calendarTemplateData.findUnique({
                        where: { id: Number(body.source), isDeleted: false, }
                    }),

                    await this.databaseService.calendarTemplateData.findUnique({
                        where: { id: Number(body.target), isDeleted: false }
                    })
                ]);

                if (!source || !target) {
                    throw new ForbiddenException("The source or target event doesn't exist.")
                }

                await this.databaseService.calendarTemplateDataLink.create({
                    data: {
                        templateId: template.id,
                        sourceId: source.id,
                        targetId: target.id,
                        type: MapToType[`ENUM_${body.type}`] as TypeEnum,
                    }
                })

                const calendarTemplateData = await this.calendarTemplateService.calendarTemplateData(companyId, template.id);

                return { calendarTemplateData }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
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

    async removeLinkBetweenEvents(user: User, companyId: number, templateId: number, linkId: number) {
        try {
            if (user.userType === UserTypes.ADMIN || user.userType === UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType === UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const [template, link] = await Promise.all([
                    await this.databaseService.calendarTemplate.findUnique({ where: { id: templateId, isDeleted: false } }),
                    await this.databaseService.calendarTemplateDataLink.findUnique({ where: { id: linkId, isDeleted: false } })
                ]);

                if (!template || !link) {
                    throw new ForbiddenException("Template or the link doesnot exist");
                }

                await this.databaseService.calendarTemplateDataLink.update({
                    where: { id: linkId },
                    data: { isDeleted: true }
                })

                const calendarTemplateData = await this.calendarTemplateService.calendarTemplateData(companyId, template.id);
                return { calendarTemplateData }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
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
}
