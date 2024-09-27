import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber } from "class-validator";

export class CreateUpdateExtraFeeDTO {

    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    extraFee: number;

    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    companyId: number;
}
