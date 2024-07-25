import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";


export class JobProjectEstimatorDTO {

    @IsOptional()
    @IsNumber()
    id:number;

    @IsNumber()
    @IsNotEmpty()
    jobProjectEstimatorHeaderId: number

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
}