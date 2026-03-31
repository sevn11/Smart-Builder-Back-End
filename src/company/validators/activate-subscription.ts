import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ActivateSubscriptionDTO {
    @IsString()
    @IsNotEmpty()
    paymentMethodId: string;

    @IsString()
    @IsNotEmpty()
    planType: string; // "MONTHLY" | "YEARLY"

    @IsString()
    @IsOptional()
    promoCode?: string;

    @IsBoolean()
    @IsOptional()
    signHere?: boolean;
}
