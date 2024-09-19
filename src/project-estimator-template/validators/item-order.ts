import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber } from "class-validator";


export class ItemOrderDTO {

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    order: number

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    itemId: number

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    headerId: number
}