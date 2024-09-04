import { IsNumber, IsOptional } from "class-validator";

export class CashFlowDTO {

    @IsNumber()
    @IsOptional()
    salesDeduction: number

    @IsNumber()
    @IsOptional()
    deduction: number

    @IsNumber()
    @IsOptional()
    depreciation: number

    @IsNumber()
    @IsOptional()
    expenses: number
}