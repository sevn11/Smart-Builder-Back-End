import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum } from "class-validator";
import { ProfitCalculationType } from "@prisma/client";

export class ProjectEstimatorAccountingTemplateDTO {

    @IsString()
    @IsNotEmpty()
    headerName: string

    @IsString()
    @IsNotEmpty()
    item: string

    @IsString()
    @IsNotEmpty()
    description: string

    @IsString()
    @IsNotEmpty()
    costType: string

    @IsNumber()
    @IsNotEmpty()
    quantity: number

    @IsNumber()
    @IsNotEmpty()
    unitCost: number

    @IsNumber()
    @IsNotEmpty()
    actualCost: number

    @IsNumber()
    @IsNotEmpty()
    grossProfit: number

    @IsNumber()
    @IsNotEmpty()
    contractPrice: number
    
    @IsBoolean()
    @IsOptional()
    isCourtesyCredit: boolean

    @IsString()
    @IsEnum(ProfitCalculationType)
    profitCalculationType: ProfitCalculationType
}