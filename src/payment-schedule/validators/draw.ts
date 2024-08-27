import { IsBoolean, IsNotEmpty, isNumber, IsNumber, IsOptional, IsString } from "class-validator"


export class PaymentScheduleDrawDTO {

    @IsString()
    @IsNotEmpty()
    paymentDate: string

    @IsNumber()
    @IsOptional()
    amount: number

    @IsNumber()
    @IsOptional()
    drawPercentage: number

    @IsNumber()
    @IsOptional()
    bankFees: number

    @IsBoolean()
    @IsOptional()
    received: boolean

}