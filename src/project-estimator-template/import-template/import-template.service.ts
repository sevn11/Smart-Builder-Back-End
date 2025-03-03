import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaErrorCodes, ResponseMessages, TemplateType } from 'src/core/utils';
import { ProfitCalculationType } from 'src/core/utils/company';
import { marginCalculation, markupCalculation } from 'src/core/utils/profit-calculation';
import { DatabaseService } from 'src/database/database.service';
export interface ImportData {
    _is_project_estimator: string;
    header: string;
    item: string;
    description: string | number;
    costtype: string;
    quantity: string | number;
    unitcost: string | number;
    grossprofit: string | number;
    contractprice: string | number;
    actualcost: string | number;
    itemorder: string | number;
    headerorder: string | number;
}

export interface GroupedImportData {
    header: string,
    headerOrder: number;
    items: ImportData[]
}

@Injectable()
export class ImportTemplateService {

    constructor(private databaseService: DatabaseService) { }

    async groupContent(items: ImportData[]) {
        const groupedItems = items.reduce<{ header: string; headerOrder: number; items: ImportData[] }[]>((acc, item) => {
            const group = acc.find(g => g.header === item.header);
            if (group) {
                group.items.push(item);
            } else {
                acc.push({
                    header: item.header,
                    headerOrder: Number(item.headerorder),
                    items: [item],
                });
            }
            return acc;
        }, []);
        return groupedItems;
    }

    async processImport(element: GroupedImportData, templateId: number, companyId: number) {
        try {
            const importResponse = await this.databaseService.$transaction(async (tx) => {
                const company = await tx.company.findUniqueOrThrow({
                    where: { id: companyId, isDeleted: false }
                })
                const updateTemplate = await tx.projectEstimatorTemplate.update({
                    where: { id: templateId, companyId, isDeleted: false },
                    data: { profitCalculationType: company.profitCalculationType }
                })
                const header = await tx.projectEstimatorTemplateHeader.create({
                    data: {
                        name: element.header,
                        companyId,
                        petId: templateId,
                        headerOrder: Number(element.headerOrder)
                    }
                });

                if (header && header.id) {
                    // Use Promise.all to ensure all async map operations complete before continuing
                    await Promise.all(
                        element.items.map(async (val) => {
                            const unitCost = parseFloat(String(val.unitcost));
                            const quantity = parseFloat(String(val.quantity));
                            const grossProfit = parseFloat(String(val.grossprofit));

                            const contractPrice =
                                updateTemplate.profitCalculationType === ProfitCalculationType.MARKUP
                                    ? markupCalculation(quantity * unitCost, grossProfit)
                                    : marginCalculation(quantity * unitCost, grossProfit);

                            await tx.projectEstimatorTemplateData.create({
                                data: {
                                    item: val.item,
                                    description: typeof val.description === 'string' ? val.description : val.description.toString(),
                                    costType: val.costtype,
                                    quantity: parseFloat(String(val.quantity)),
                                    unitCost: parseFloat(String(val.unitcost)),
                                    actualCost: parseFloat(String(val.actualcost)),
                                    grossProfit: parseFloat(String(val.grossprofit)),
                                    contractPrice: contractPrice,
                                    isDeleted: false,
                                    petHeaderId: header.id,
                                    order: Number(val.itemorder)
                                }
                            });
                        })
                    );
                }
            });
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

    // create template for all 3 set of templates.
    async createTemplate(body: { templatename: string }, companyId: number) {
        try {
            const response = await this.databaseService.$transaction(async (tx) => {
                const projectEstimator = await tx.projectEstimatorTemplate.create({
                    data: {
                        templateName: body.templatename,
                        companyId
                    }
                });

                const questionnaire = await tx.questionnaireTemplate.create({
                    data: {
                        name: body.templatename,
                        companyId,
                        isCompanyTemplate: true,
                        templateType: TemplateType.PROJECT_ESTIMATOR,
                        projectEstimatorTemplateId: projectEstimator.id
                    }
                });

                return { questionnaire, projectEstimator }
            });

            return response.projectEstimator;
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
            const projectEst = await this.databaseService.projectEstimatorTemplate.findUnique({
                where: {
                    id: Number(body.templateId)
                }
            })
            if (!projectEst || !projectEst.id) {
                throw new ForbiddenException('Template not found')
            }
            return { ...projectEst }

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
