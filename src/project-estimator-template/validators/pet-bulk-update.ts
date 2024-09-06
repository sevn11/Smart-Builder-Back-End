import { IsArray, IsBoolean, IsNumber, IsString } from "class-validator";

export class ProjectEstimatorTemplateDTO {
    @IsNumber()
    id: number;
    @IsString()
    item: string;
    @IsString()
    description: string;
    @IsString()
    costType: string;
    @IsNumber()
    quantity: number;
    @IsNumber()
    unitCost: number;
    @IsNumber()
    actualCost: number;
    @IsNumber()
    grossProfit: number;
    @IsNumber()
    contractPrice: number;
    @IsBoolean()
    isDeleted: boolean;
    @IsNumber()
    petHeaderId: number

    constructor(partial: Partial<ProjectEstimatorTemplateDTO>) {
        Object.assign(this, partial);
    }
}

export class BulkUpdateProjectEstimatorTemplateDTO {
    @IsNumber()
    id: number;
    @IsString()
    name: string;
    @IsNumber()
    companyId: number;
    @IsBoolean()
    isDeleted: boolean;
    @IsArray()
    ProjectEstimatorTemplateData: ProjectEstimatorTemplateDTO[];

    constructor(partial: Partial<BulkUpdateProjectEstimatorTemplateDTO>) {
        Object.assign(this, partial);
    }
}