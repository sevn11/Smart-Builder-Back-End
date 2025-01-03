import { ProfitCalculationType } from "@prisma/client";
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsString, IsOptional } from "class-validator";


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