import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsEnum } from "class-validator";

export enum PlanType {
    MONTHLY = "MONTHLY",
    YEARLY = "YEARLY",
}

export class ActivateSubscriptionDTO {
    @IsString()
    @IsNotEmpty()
    paymentMethodId: string;

    @IsEnum(PlanType)
    @IsNotEmpty()
    planType: PlanType;

    @IsString()
    @IsOptional()
    promoCode?: string;

    @IsBoolean()
    @IsOptional()
    signHere?: boolean;
}
