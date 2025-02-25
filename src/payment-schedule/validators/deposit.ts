import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class PaymentScheduleDepositDTO {

    @IsString()
    @IsNotEmpty()
    paymentDate: string

    @IsNumber()
    @IsOptional()
    amount: number

    @IsNumber()
    @IsOptional()
    addtFundDisbursed: number
}