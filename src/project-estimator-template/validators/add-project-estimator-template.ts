import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { ProfitCalculationType } from "src/core/utils/company";


export class ProjectEstimatorTemplateDTO {

    @IsOptional()
    @IsNumber()
    id: number;

    @IsNumber()
    @IsNotEmpty()
    petHeaderId: number

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
    isLotCost: boolean

    @IsString()
    @IsEnum(ProfitCalculationType)
    profitCalculationType: ProfitCalculationType
}