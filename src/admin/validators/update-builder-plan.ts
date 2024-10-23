import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber } from "class-validator";

export class UpdateBuilderPlanAmountDTO {
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    planAmount: number;

    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    companyId: number;
}