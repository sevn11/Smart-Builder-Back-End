import { IsArray, IsBoolean, IsNumber, IsString } from "class-validator";

export class JobProjectEstimatorDTO {
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
    jobProjectEstimatorHeaderId: number;

    constructor(partial: Partial<JobProjectEstimatorDTO>) {
        Object.assign(this, partial);
    }
}

export class BulkUpdateProjectEstimatorDTO {
    @IsNumber()
    id: number;
    @IsString()
    name: string;
    @IsNumber()
    companyId: number;
    @IsNumber()
    jobId: number;
    @IsBoolean()
    isDeleted: boolean;
    @IsArray()
    JobProjectEstimator: JobProjectEstimatorDTO[];

    constructor(partial: Partial<BulkUpdateProjectEstimatorDTO>) {
        Object.assign(this, partial);
    }
}