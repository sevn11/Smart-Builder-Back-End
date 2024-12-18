import { IsNotEmpty, IsString } from "class-validator";


export class PaymentMethodDTO {
    
    @IsString()
    @IsNotEmpty()
    paymentMethodId: string   
}
